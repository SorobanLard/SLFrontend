'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';
import type {
  PaymentMethod,
  PaymentRequest,
  PaymentRequestPaymentMethodEvent,
  StripePaymentRequestButtonElementClickEvent,
} from '@stripe/stripe-js';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

type Wallet = 'applePay' | 'googlePay';

const WALLET_LABELS: Record<Wallet, string> = {
  applePay: 'Apple Pay',
  googlePay: 'Google Pay',
};

const INSUFFICIENT_BALANCE_PATTERNS = [
  /insufficient[_\s-]?balance/i,
  /insufficient[_\s-]?funds/i,
  /op_underfunded|tx_insufficient_balance|underfunded/i,
  /balance is not sufficient/i,
  /not enough (?:funds|balance|xlm|usdc|tokens)/i,
  /resulting balance is not within the allowed range/i,
  /hosterror:.*balance/i,
];

export function isInsufficientBalanceError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') {
    return INSUFFICIENT_BALANCE_PATTERNS.some((pattern) => pattern.test(error));
  }
  if (typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      decline_code?: unknown;
      reason?: unknown;
      error?: unknown;
    };
    const parts = [
      candidate.message,
      candidate.code,
      candidate.decline_code,
      candidate.reason,
      candidate.error,
    ].filter((item): item is string => typeof item === 'string');
    return parts.some((part) => INSUFFICIENT_BALANCE_PATTERNS.some((pattern) => pattern.test(part)));
  }
  return false;
}

export function formatInsufficientBalanceMessage(
  amount: number,
  currency = 'USDC',
  walletBalance?: number,
): string {
  const unit = currency.toUpperCase();
  if (typeof walletBalance === 'number' && Number.isFinite(walletBalance)) {
    return `Insufficient balance for enrollment: your wallet has ${walletBalance.toFixed(2)} ${unit}, but ${amount.toFixed(2)} ${unit} is required. Please add funds to your wallet and try again.`;
  }
  return `Insufficient balance for enrollment (${amount.toFixed(2)} ${unit} required). Please top up your wallet balance and try again.`;
}

export interface WalletPaymentButtonProps {
  /** Order total in major units (e.g. 49.99), same figure the card form charges. */
  amount: number;
  /** ISO currency code, lower-case as Stripe expects. */
  currency?: string;
  /** Two-letter country of the Stripe account. */
  country?: string;
  /** Line shown on the wallet sheet next to the total. */
  label?: string;
  disabled?: boolean;
  /** Optional known wallet balance (in major units) used to pre-check before submitting. */
  walletBalance?: number;
  /** Optional async balance fetcher called before submitting an on-chain/wallet payment. */
  getWalletBalance?: () => Promise<number>;
  /** Charges the wallet's payment method. Throw to report a failure. */
  confirmPayment: (paymentMethod: PaymentMethod) => Promise<void>;
  onSuccess: (paymentMethod: PaymentMethod) => void;
  onError?: (error: unknown) => void;
  /** Fires with `true` when the wallet sheet opens and `false` once it closes. */
  onSheetOpenChange?: (open: boolean) => void;
}

/** Stripe wants the smallest currency unit; every currency we sell in has cents. */
const toMinorUnits = (amount: number) => Math.round(amount * 100);

/**
 * Apple Pay / Google Pay via Stripe's Payment Request Button. Renders nothing
 * until `canMakePayment()` confirms a wallet is set up on this device, so the
 * card form stays the only option everywhere else.
 */
export function WalletPaymentButton({
  amount,
  currency = 'usd',
  country = 'US',
  label = 'SorobanLard courses',
  disabled = false,
  walletBalance,
  getWalletBalance,
  confirmPayment,
  onSuccess,
  onError,
  onSheetOpenChange,
}: WalletPaymentButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [insufficientBalanceError, setInsufficientBalanceError] = useState<string | null>(null);
  const lastPaymentMethodRef = useRef<PaymentMethod | null>(null);

  // The Payment Request is created once per Stripe instance; later amount
  // changes go through `update()`, so keep the latest values in a ref.
  const latest = useRef({
    amount,
    currency,
    label,
    walletBalance,
    getWalletBalance,
    confirmPayment,
    onSuccess,
    onError,
    onSheetOpenChange,
  });
  latest.current = {
    amount,
    currency,
    label,
    walletBalance,
    getWalletBalance,
    confirmPayment,
    onSuccess,
    onError,
    onSheetOpenChange,
  };

  const setOpen = (open: boolean) => {
    setSheetOpen(open);
    latest.current.onSheetOpenChange?.(open);
  };

  const verifySufficientBalance = async (): Promise<number | null> => {
    const {
      amount: currentAmount,
      walletBalance: staticBalance,
      getWalletBalance: fetchBalance,
    } = latest.current;

    if (typeof staticBalance === 'number' && staticBalance < currentAmount) {
      return staticBalance;
    }

    if (typeof fetchBalance === 'function') {
      const fetched = await fetchBalance();
      if (typeof fetched === 'number' && fetched < currentAmount) {
        return fetched;
      }
    }

    return null;
  };

  useEffect(() => {
    if (!stripe) return;

    let cancelled = false;
    const request = stripe.paymentRequest({
      country,
      currency,
      total: { label: latest.current.label, amount: toMinorUnits(latest.current.amount) },
      requestPayerName: true,
      requestPayerEmail: true,
      // Only surface the device wallets this feature is about.
      disableWallets: ['link', 'browserCard'],
    });

    request
      .canMakePayment()
      .then((result) => {
        if (cancelled || !result) return;
        const available = (['applePay', 'googlePay'] as const).find((key) => result[key]);
        if (!available) return;
        setWallet(available);
        setPaymentRequest(request);
      })
      .catch(() => {
        // No wallet support is the normal case on most desktops — fall back silently.
      });

    return () => {
      cancelled = true;
      setPaymentRequest(null);
      setWallet(null);
    };
  }, [stripe, country, currency]);

  useEffect(() => {
    paymentRequest?.update({ total: { label, amount: toMinorUnits(amount) } });
  }, [paymentRequest, amount, label]);

  useEffect(() => {
    if (!paymentRequest) return;

    const handlePaymentMethod = async (event: PaymentRequestPaymentMethodEvent) => {
      const {
        amount: currentAmount,
        currency: currentCurrency,
        walletBalance: currentBalance,
        confirmPayment: confirm,
        onSuccess: succeed,
        onError: fail,
      } = latest.current;

      lastPaymentMethodRef.current = event.paymentMethod;
      setInsufficientBalanceError(null);

      try {
        const shortfallBalance = await verifySufficientBalance();
        if (shortfallBalance !== null) {
          const message = formatInsufficientBalanceMessage(
            currentAmount,
            currentCurrency,
            shortfallBalance,
          );
          setInsufficientBalanceError(message);
          event.complete('fail');
          setOpen(false);
          fail?.({ code: 'card_declined', decline_code: 'insufficient_funds', message });
          return;
        }

        await confirm(event.paymentMethod);
        event.complete('success');
        setOpen(false);
        succeed(event.paymentMethod);
      } catch (error) {
        event.complete('fail');
        setOpen(false);
        if (isInsufficientBalanceError(error)) {
          const message = formatInsufficientBalanceMessage(
            currentAmount,
            currentCurrency,
            currentBalance,
          );
          setInsufficientBalanceError(message);
        }
        fail?.(error);
      }
    };
    const handleCancel = () => setOpen(false);

    paymentRequest.on('paymentmethod', handlePaymentMethod);
    paymentRequest.on('cancel', handleCancel);
    return () => {
      paymentRequest.off('paymentmethod', handlePaymentMethod);
      paymentRequest.off('cancel', handleCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentRequest]);

  if (!paymentRequest || !wallet) return null;

  const handleClick = (event: StripePaymentRequestButtonElementClickEvent) => {
    if (disabled || sheetOpen) {
      event.preventDefault();
      return;
    }
    setInsufficientBalanceError(null);

    if (typeof walletBalance === 'number' && walletBalance < amount) {
      event.preventDefault();
      const message = formatInsufficientBalanceMessage(amount, currency, walletBalance);
      setInsufficientBalanceError(message);
      onError?.({ code: 'card_declined', decline_code: 'insufficient_funds', message });
      return;
    }

    setOpen(true);
  };

  const handleRetry = async () => {
    setInsufficientBalanceError(null);

    const shortfallBalance = await verifySufficientBalance();
    if (shortfallBalance !== null) {
      const message = formatInsufficientBalanceMessage(amount, currency, shortfallBalance);
      setInsufficientBalanceError(message);
      return;
    }

    if (lastPaymentMethodRef.current) {
      try {
        setOpen(true);
        await latest.current.confirmPayment(lastPaymentMethodRef.current);
        setOpen(false);
        latest.current.onSuccess(lastPaymentMethodRef.current);
      } catch (error) {
        setOpen(false);
        if (isInsufficientBalanceError(error)) {
          setInsufficientBalanceError(
            formatInsufficientBalanceMessage(amount, currency, walletBalance),
          );
        }
        latest.current.onError?.(error);
      }
    }
  };

  return (
    <div className="space-y-4" data-testid="wallet-payment">
      <div className={disabled && !sheetOpen ? 'pointer-events-none opacity-60' : undefined}>
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '48px' } },
          }}
          onClick={handleClick}
        />
      </div>

      {sheetOpen && (
        <p role="status" className="flex items-center justify-center gap-2 text-sm text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Waiting for {WALLET_LABELS[wallet]}…
        </p>
      )}

      {insufficientBalanceError && (
        <div
          role={onError ? 'status' : 'alert'}
          aria-live="polite"
          data-testid="wallet-insufficient-balance"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="space-y-2">
              <p className="font-semibold">Insufficient wallet balance</p>
              <p className="text-amber-800">{insufficientBalanceError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-500">
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
        or pay with card
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
      </div>
    </div>
  );
}
