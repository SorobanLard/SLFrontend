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
  WalletPaymentButton,
  formatInsufficientBalanceMessage,
  isInsufficientBalanceError,
} from '../WalletPaymentButton';

const WALLET_METHOD = { id: 'pm_wallet_211' } as any;

describe('WalletPaymentButton insufficient balance UX (#211)', () => {
  beforeEach(() => {
    wallet.stripe.paymentRequest.mockClear();
    wallet.request.canMakePayment.mockReset();
    wallet.request.canMakePayment.mockResolvedValue({ applePay: true, googlePay: false });
  });

  it('classifies Soroban and Stellar insufficient balance errors accurately', () => {
    expect(
      isInsufficientBalanceError(
        new Error('Simulation: HostError: Error(Contract, #3) balance is not sufficient'),
      ),
    ).toBe(true);
    expect(isInsufficientBalanceError(new Error('Transaction failed: op_underfunded'))).toBe(true);
    expect(isInsufficientBalanceError({ code: 'insufficient_balance' })).toBe(true);
    expect(isInsufficientBalanceError(new Error('Network unreachable'))).toBe(false);
  });

  it('pre-checks walletBalance before invoking confirmPayment and displays a friendly message', async () => {
    const confirmPayment = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <WalletPaymentButton
        amount={50}
        currency="usdc"
        walletBalance={12.5}
        confirmPayment={confirmPayment}
        onSuccess={onSuccess}
        onError={onError}
      />,
    );

    const payButton = await screen.findByRole('button', { name: /wallet pay/i });
    fireEvent.click(payButton);

    const banner = await screen.findByTestId('wallet-insufficient-balance');
    expect(banner).toHaveTextContent(/insufficient wallet balance/i);
    expect(banner).toHaveTextContent(/12\.50 USDC/i);
    expect(banner).toHaveTextContent(/50\.00 USDC is required/i);
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('surfaces a friendly insufficient balance message instead of raw Soroban contract errors and recovers on retry', async () => {
    const confirmPayment = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Simulation: HostError: Error(Contract, #10) resulting balance is not within the allowed range'),
      )
      .mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();

    render(
      <WalletPaymentButton
        amount={49.99}
        currency="usdc"
        confirmPayment={confirmPayment}
        onSuccess={onSuccess}
      />,
    );

    const payButton = await screen.findByRole('button', { name: /wallet pay/i });
    fireEvent.click(payButton);

    const complete = vi.fn();
    await act(async () => {
      await wallet.handlers.paymentmethod?.({ paymentMethod: WALLET_METHOD, complete });
    });

    expect(complete).toHaveBeenCalledWith('fail');
    const banner = await screen.findByTestId('wallet-insufficient-balance');
    expect(banner).toHaveTextContent(formatInsufficientBalanceMessage(49.99, 'usdc'));
    expect(banner).not.toHaveTextContent(/HostError/i);

    fireEvent.click(screen.getByRole('button', { name: /retry payment/i }));

    await waitFor(() => {
      expect(confirmPayment).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledWith(WALLET_METHOD);
    });
    expect(screen.queryByTestId('wallet-insufficient-balance')).not.toBeInTheDocument();
  });
});
