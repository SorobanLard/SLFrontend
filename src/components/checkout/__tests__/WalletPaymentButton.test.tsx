import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WalletPaymentButton,
  isInsufficientBalanceError,
  formatInsufficientBalanceMessage,
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

describe('WalletPaymentButton insufficient balance UX (Issue #211)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wallet.request.canMakePayment.mockResolvedValue({ applePay: true, googlePay: false });
  });

  it('pre-checks walletBalance before opening the payment sheet and shows a clear insufficient balance message', async () => {
    const confirmPayment = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <WalletPaymentButton
        amount={49.99}
        walletBalance={12.5}
        confirmPayment={confirmPayment}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );

    const payButton = await screen.findByRole('button', { name: /pay with wallet/i });
    fireEvent.click(payButton);

    const alert = await screen.findByTestId('wallet-insufficient-balance');
    expect(alert).toHaveTextContent(/insufficient wallet balance/i);
    expect(alert).toHaveTextContent(/\$49\.99 USDC/i);
    expect(alert).toHaveTextContent(/\$12\.50 USDC/i);
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);

    // User can dismiss/reset via Retry payment button
    fireEvent.click(screen.getByRole('button', { name: /retry payment/i }));
    expect(screen.queryByTestId('wallet-insufficient-balance')).not.toBeInTheDocument();
  });

  it('translates raw Soroban contract insufficient balance errors into a friendly recoverable state and succeeds on retry', async () => {
    const confirmPayment = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Simulation: HostError: Error(Contract, #10) balance is not sufficient'),
      )
      .mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <WalletPaymentButton
        amount={35}
        confirmPayment={confirmPayment}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );

    await screen.findByRole('button', { name: /pay with wallet/i });

    const complete1 = vi.fn();
    await act(async () => {
      await wallet.handlers.paymentmethod?.({
        paymentMethod: { id: 'pm_stellar_1' },
        complete: complete1,
      });
    });

    expect(complete1).toHaveBeenCalledWith('fail');
    const alert = screen.getByTestId('wallet-insufficient-balance');
    expect(alert).toHaveTextContent(/insufficient balance for course enrollment/i);
    expect(alert).toHaveTextContent(/\$35\.00 USDC/i);
    expect(alert).not.toHaveTextContent(/HostError/);

    // Retry after topping up wallet
    fireEvent.click(screen.getByRole('button', { name: /retry payment/i }));
    expect(screen.queryByTestId('wallet-insufficient-balance')).not.toBeInTheDocument();

    const complete2 = vi.fn();
    await act(async () => {
      await wallet.handlers.paymentmethod?.({
        paymentMethod: { id: 'pm_stellar_1' },
        complete: complete2,
      });
    });

    await waitFor(() => {
      expect(complete2).toHaveBeenCalledWith('success');
      expect(onSuccess).toHaveBeenCalledWith({ id: 'pm_stellar_1' });
    });
  });

  it('identifies Soroban and Horizon underfunded error messages accurately', () => {
    expect(isInsufficientBalanceError(new Error('Transaction failed: op_underfunded'))).toBe(true);
    expect(isInsufficientBalanceError('Simulation: insufficient balance')).toBe(true);
    expect(isInsufficientBalanceError(new Error('Network timeout'))).toBe(false);
    expect(formatInsufficientBalanceMessage(25, 5)).toContain('$25.00 USDC');
  });
});
