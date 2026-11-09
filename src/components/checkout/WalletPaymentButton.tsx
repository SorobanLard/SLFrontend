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

const SOROBAN_INSUFFICIENT_BALANCE_PATTERN =
  /insufficient\s+balance|balance\s+is\s+not\s+sufficient|op_underfunded|underfunded|insufficient\s+funds\s+for\s+enrollment|not\s+enough\s+usdc|not\s+enough\s+xlm|balance\s+too\s+low/i;

export function isInsufficientBalanceError(error: unknown): boolean {
  if (!error) return false;
  const text =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';
  return SOROBAN_INSUFFICIENT_BALANCE_PATTERN.test(text);
}

export function formatInsufficientBalanceMessage(
  amount: number,
  walletBalance?: number | null,
): string {
  const requiredFormatted = `$${amount.toFixed(2)} USDC`;
  if (typeof walletBalance === 'number' && Number.isFinite(walletBalance)) {
    return `Insufficient balance for course enrollment: this course costs ${requiredFormatted}, but your wallet only has $${walletBalance.toFixed(2)} USDC available. Please top up your Stellar wallet and try again.`;
  }
  return `Insufficient balance for course enrollment: your Stellar wallet does not have enough USDC (${requiredFormatted} required) or XLM for network fees. Please fund your wallet and try again.`;
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
  /** Optional known Stellar wallet USDC balance for pre-check before submitting on-chain. */
  walletBalance?: number;
  /** Charges the wallet's payment method. Throw to report a failure. */
  confirmPayment: (paymentMethod: PaymentMethod) => Promise<void>;
  onSuccess: (paymentMethod: PaymentMethod) => void;
  onError: (error: unknown) => void;
  /** Fires with `true` when the wallet sheet opens and `false` once it closes. */
  onSheetOpenChange?: (open: boolean) => void;
}

/** Stripe wants the smallest currency unit; every currency we sell in has cents. */
const toMinorUnits = (amount: number) => Math.round(amount * 100);

/**
 * Apple Pay / Google Pay / Wallet payment button. Renders nothing
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
  confirmPayment,
  onSuccess,
  onError,
  onSheetOpenChange,
}: WalletPaymentButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // The Payment Request is created once per Stripe instance; later amount
  // changes go through `update()`, so keep the latest values in a ref.
  const latest = useRef({
    amount,
    label,
    walletBalance,
    confirmPayment,
    onSuccess,
    onError,
    onSheetOpenChange,
  });
  latest.current = {
    amount,
    label,
    walletBalance,
    confirmPayment,
    onSuccess,
    onError,
    onSheetOpenChange,
  };

  const setOpen = (open: boolean) => {
    setSheetOpen(open);
    latest.current.onSheetOpenChange?.(open);
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
        walletBalance: currentBalance,
        confirmPayment: confirm,
        onSuccess: succeed,
        onError: fail,
      } = latest.current;

      if (typeof currentBalance === 'number' && currentBalance < currentAmount) {
        const message = formatInsufficientBalanceMessage(currentAmount, currentBalance);
        event.complete('fail');
        setOpen(false);
        setBalanceError(message);
        fail(new Error(message));
        return;
      }

      try {
        setBalanceError(null);
        await confirm(event.paymentMethod);
        event.complete('success');
        setOpen(false);
        succeed(event.paymentMethod);
      } catch (error) {
        event.complete('fail');
        setOpen(false);
        if (isInsufficientBalanceError(error)) {
          const message = formatInsufficientBalanceMessage(currentAmount, currentBalance);
          setBalanceError(message);
          fail(new Error(message));
          return;
        }
        fail(error);
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

    if (typeof walletBalance === 'number' && walletBalance < amount) {
      event.preventDefault();
      const message = formatInsufficientBalanceMessage(amount, walletBalance);
      setBalanceError(message);
      onError(new Error(message));
      return;
    }

    setBalanceError(null);
    setOpen(true);
  };

  const handleRetry = () => {
    setBalanceError(null);
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

      {balanceError && (
        <div
          role="alert"
          data-testid="wallet-insufficient-balance"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-950">Insufficient wallet balance</p>
              <p className="mt-0.5 leading-relaxed">{balanceError}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry payment
            </button>
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
