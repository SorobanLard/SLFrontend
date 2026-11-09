'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';
import type {
  PaymentMethod,
  PaymentRequest,
  PaymentRequestPaymentMethodEvent,
  StripePaymentRequestButtonElementClickEvent,
} from '@stripe/stripe-js';
import { Clock, Loader2, RefreshCw } from 'lucide-react';

type Wallet = 'applePay' | 'googlePay';

const WALLET_LABELS: Record<Wallet, string> = {
  applePay: 'Apple Pay',
  googlePay: 'Google Pay',
};

export const DEFAULT_CONFIRMATION_TIMEOUT_MS = 40_000;

export const WALLET_CONFIRMATION_TIMEOUT_MESSAGE =
  'Transaction confirmation timed out on the network. Please check your wallet activity to verify whether the transaction succeeded before retrying.';

const TIMEOUT_ERROR_PATTERN =
  /transaction\s+not\s+confirmed|confirmation\s+timed?\s+out|network\s+timeout|request\s+timed?\s+out|etimedout|timeout\s+exceeded/i;

export class WalletConfirmationTimeoutError extends Error {
  readonly code = 'TX_CONFIRMATION_TIMEOUT' as const;
  readonly recoverable = true as const;
  readonly retryable = true as const;

  constructor(message = WALLET_CONFIRMATION_TIMEOUT_MESSAGE) {
    super(message);
    this.name = 'WalletConfirmationTimeoutError';
  }
}

export function isTransactionTimeoutError(error: unknown): boolean {
  if (error instanceof WalletConfirmationTimeoutError) return true;
  if (!error) return false;
  const text =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';
  return TIMEOUT_ERROR_PATTERN.test(text);
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
  /** Maximum milliseconds to wait for on-chain/wallet confirmation before timing out (defaults to 40,000ms). */
  confirmationTimeoutMs?: number;
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
  confirmationTimeoutMs = DEFAULT_CONFIRMATION_TIMEOUT_MS,
  confirmPayment,
  onSuccess,
  onError,
  onSheetOpenChange,
}: WalletPaymentButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  // The Payment Request is created once per Stripe instance; later amount
  // changes go through `update()`, so keep the latest values in a ref.
  const latest = useRef({
    amount,
    label,
    confirmationTimeoutMs,
    confirmPayment,
    onSuccess,
    onError,
    onSheetOpenChange,
  });
  latest.current = {
    amount,
    label,
    confirmationTimeoutMs,
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
        confirmationTimeoutMs: timeoutMs,
        confirmPayment: confirm,
        onSuccess: succeed,
        onError: fail,
      } = latest.current;

      setTimeoutError(null);
      setConfirming(true);

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          confirm(event.paymentMethod),
          new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new WalletConfirmationTimeoutError());
            }, timeoutMs);
          }),
        ]);
        event.complete('success');
        setConfirming(false);
        setOpen(false);
        succeed(event.paymentMethod);
      } catch (error) {
        event.complete('fail');
        setConfirming(false);
        setOpen(false);
        if (isTransactionTimeoutError(error)) {
          const timeoutErr =
            error instanceof WalletConfirmationTimeoutError
              ? error
              : new WalletConfirmationTimeoutError();
          setTimeoutError(timeoutErr.message);
          fail(timeoutErr);
          return;
        }
        fail(error);
      } finally {
        if (timeoutHandle !== undefined) {
          clearTimeout(timeoutHandle);
        }
      }
    };
    const handleCancel = () => {
      setConfirming(false);
      setOpen(false);
    };

    paymentRequest.on('paymentmethod', handlePaymentMethod);
    paymentRequest.on('cancel', handleCancel);
    return () => {
      paymentRequest.off('paymentmethod', handlePaymentMethod);
      paymentRequest.off('cancel', handleCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentRequest]);

  if (!paymentRequest || !wallet) return null;

  const isBusy = disabled || sheetOpen || confirming;

  const handleClick = (event: StripePaymentRequestButtonElementClickEvent) => {
    if (isBusy) {
      event.preventDefault();
      return;
    }
    setTimeoutError(null);
    setOpen(true);
  };

  const handleRetryAfterTimeout = () => {
    setTimeoutError(null);
    setConfirming(false);
    setOpen(false);
  };

  return (
    <div className="space-y-4" data-testid="wallet-payment">
      <div className={isBusy && !sheetOpen ? 'pointer-events-none opacity-60' : undefined}>
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '48px' } },
          }}
          onClick={handleClick}
        />
      </div>

      {confirming ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="wallet-tx-pending"
          className="flex items-center justify-center gap-2 text-sm font-medium text-ink-700"
        >
          <Loader2 className="h-4 w-4 animate-spin text-saffron-600" aria-hidden="true" />
          Confirming transaction on Stellar… This may take several seconds.
        </p>
      ) : (
        sheetOpen && (
          <p role="status" className="flex items-center justify-center gap-2 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Waiting for {WALLET_LABELS[wallet]}…
          </p>
        )
      )}

      {timeoutError && (
        <div
          role="alert"
          data-testid="wallet-tx-timeout"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2"
        >
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-950">Transaction confirmation timed out</p>
              <p className="mt-0.5 leading-relaxed">{timeoutError}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRetryAfterTimeout}
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
