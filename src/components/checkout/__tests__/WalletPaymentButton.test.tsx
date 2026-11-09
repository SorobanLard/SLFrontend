import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WalletPaymentButton,
  WalletConfirmationTimeoutError,
  isTransactionTimeoutError,
} from '../WalletPaymentButton';

const { wallet } = vi.hoisted(() => {
  const handlers: Record<string, (event?: any) => unknown> = {};
  const request = {
    canMakePayment: vi.fn(),
    update: vi.fn(),
    on: vi.fn((type: string, handler: (event?: any) => unknown) => {
      handlers[type] = handler;
      return request;
    }),
    off: vi.fn((type: string) => {
      delete handlers[type];
      return request;
    }),
  };
  return {
    wallet: {
      handlers,
      request,
      stripe: {
        paymentRequest: vi.fn(() => request),
      },
    },
  };
});

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentRequestButtonElement: ({
    onClick,
  }: {
    onClick?: (event: { preventDefault: () => void }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onClick?.({ preventDefault: () => {} })}
    >
      Pay with Wallet
    </button>
  ),
  useStripe: () => wallet.stripe,
}));

describe('WalletPaymentButton pending & timeout UX during enrollment (Issue #210)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wallet.request.canMakePayment.mockResolvedValue({ applePay: true, googlePay: false });
  });

  it('displays an explicit pending state while Soroban transaction confirmation is in flight', async () => {
    let resolveConfirm!: () => void;
    const confirmPayment = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <WalletPaymentButton
        amount={49.99}
        confirmPayment={confirmPayment}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );

    await screen.findByRole('button', { name: /pay with wallet/i });

    const complete = vi.fn();
    let paymentPromise!: Promise<unknown>;
    act(() => {
      paymentPromise = wallet.handlers.paymentmethod?.({
        paymentMethod: { id: 'pm_soroban_1' },
        complete,
      }) as Promise<unknown>;
    });

    expect(await screen.findByTestId('wallet-tx-pending')).toHaveTextContent(
      /confirming transaction on stellar/i,
    );

    await act(async () => {
      resolveConfirm();
      await paymentPromise;
    });

    expect(screen.queryByTestId('wallet-tx-pending')).not.toBeInTheDocument();
    expect(complete).toHaveBeenCalledWith('success');
    expect(onSuccess).toHaveBeenCalledWith({ id: 'pm_soroban_1' });
  });

  it('recovers cleanly without leaving the UI stuck when transaction confirmation times out, and allows retry', async () => {
    vi.useFakeTimers();
    try {
      const neverConfirming = () => new Promise<void>(() => {});
      const confirmPayment = vi
        .fn()
        .mockImplementationOnce(neverConfirming)
        .mockResolvedValueOnce(undefined);
      const onSuccess = vi.fn();
      const onError = vi.fn();

      render(
        <WalletPaymentButton
          amount={49.99}
          confirmationTimeoutMs={5_000}
          confirmPayment={confirmPayment}
          onSuccess={onSuccess}
          onError={onError}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });

      const complete1 = vi.fn();
      let pendingCall!: Promise<unknown>;
      act(() => {
        pendingCall = wallet.handlers.paymentmethod?.({
          paymentMethod: { id: 'pm_timeout_1' },
          complete: complete1,
        }) as Promise<unknown>;
      });

      expect(screen.getByTestId('wallet-tx-pending')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_100);
        await pendingCall;
      });

      expect(screen.queryByTestId('wallet-tx-pending')).not.toBeInTheDocument();
      expect(complete1).toHaveBeenCalledWith('fail');
      expect(onError).toHaveBeenCalledWith(expect.any(WalletConfirmationTimeoutError));

      const timeoutAlert = screen.getByTestId('wallet-tx-timeout');
      expect(timeoutAlert).toHaveTextContent(/transaction confirmation timed out/i);

      // Click Retry payment and verify subsequent attempt succeeds
      fireEvent.click(screen.getByRole('button', { name: /retry payment/i }));
      expect(screen.queryByTestId('wallet-tx-timeout')).not.toBeInTheDocument();

      const complete2 = vi.fn();
      await act(async () => {
        await wallet.handlers.paymentmethod?.({
          paymentMethod: { id: 'pm_timeout_1' },
          complete: complete2,
        });
      });

      expect(complete2).toHaveBeenCalledWith('success');
      expect(onSuccess).toHaveBeenCalledWith({ id: 'pm_timeout_1' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('recognizes Soroban contract "Transaction not confirmed" errors as timeouts', () => {
    expect(isTransactionTimeoutError(new Error('Transaction not confirmed'))).toBe(true);
    expect(isTransactionTimeoutError(new WalletConfirmationTimeoutError())).toBe(true);
    expect(isTransactionTimeoutError(new Error('Invalid card'))).toBe(false);
  });
});
