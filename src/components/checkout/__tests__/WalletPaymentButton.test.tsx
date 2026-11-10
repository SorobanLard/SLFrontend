import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { wallet } = vi.hoisted(() => {
  const handlers: Record<string, (event?: unknown) => unknown> = {};
  const request = {
    canMakePayment: vi.fn(),
    update: vi.fn(),
    on: vi.fn((type: string, handler: (event?: unknown) => unknown) => {
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
      paymentRequest: vi.fn(() => request),
      stripe: { paymentRequest: vi.fn(() => request) },
    },
  };
});

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentRequestButtonElement: ({
    onClick,
  }: {
    onClick?: (event: { preventDefault: () => void }) => void;
  }) =>
    React.createElement(
      'button',
      { type: 'button', onClick: () => onClick?.({ preventDefault: () => {} }) },
      'Wallet pay',
    ),
  useStripe: () => wallet.stripe,
}));

import {
  WalletConfirmationTimeoutError,
  WalletPaymentButton,
  isTransactionTimeoutError,
} from '../WalletPaymentButton';

const WALLET_METHOD = { id: 'pm_wallet_210' } as any;

describe('WalletPaymentButton pending & timeout UX (#210)', () => {
  beforeEach(() => {
    wallet.stripe.paymentRequest.mockClear();
    wallet.request.canMakePayment.mockReset();
    wallet.request.canMakePayment.mockResolvedValue({ applePay: true, googlePay: false });
  });

  it('recognizes Soroban and network timeout errors', () => {
    expect(isTransactionTimeoutError(new WalletConfirmationTimeoutError())).toBe(true);
    expect(isTransactionTimeoutError(new Error('Transaction not confirmed'))).toBe(true);
    expect(isTransactionTimeoutError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isTransactionTimeoutError(new Error('Invalid signature'))).toBe(false);
  });

  it('shows a pending confirmation state and transitions to a recoverable timeout state when confirmation never arrives', async () => {
    const neverResolving = () => new Promise<void>(() => {});
    const confirmPayment = vi
      .fn()
      .mockImplementationOnce(neverResolving)
      .mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <WalletPaymentButton
        amount={49.99}
        timeoutMs={40}
        confirmPayment={confirmPayment}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );

    const payButton = await screen.findByRole('button', { name: /wallet pay/i });
    fireEvent.click(payButton);

    const complete = vi.fn();
    act(() => {
      void wallet.handlers.paymentmethod?.({ paymentMethod: WALLET_METHOD, complete });
    });

    expect(screen.getByTestId('wallet-pending-status')).toHaveTextContent(
      /waiting for apple pay confirmation/i,
    );

    const timeoutBanner = await screen.findByTestId('wallet-timeout-error');
    expect(timeoutBanner).toHaveTextContent(/transaction confirmation timed out/i);
    expect(screen.queryByTestId('wallet-pending-status')).not.toBeInTheDocument();
    expect(complete).toHaveBeenCalledWith('fail');
    expect(onError).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry confirmation/i }));

    await waitFor(() => {
      expect(confirmPayment).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledWith(WALLET_METHOD);
    });
    expect(screen.queryByTestId('wallet-timeout-error')).not.toBeInTheDocument();
  });
});
