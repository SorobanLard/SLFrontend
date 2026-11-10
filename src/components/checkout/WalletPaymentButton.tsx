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

export const DEFAULT_WALLET_TIMEOUT_MS = 30_000;

export class WalletConfirmationTimeoutError extends Error {
  readonly code = 'transaction_timeout';

  constructor(
    message = 'Transaction confirmation timed out. Please check your wallet before retrying so you are not charged twice.',
  ) {
    super(message);
    this.name = 'WalletConfirmationTimeoutError';
  }
}

export function isTransactionTimeoutError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof WalletConfirmationTimeoutError) return true;
  if (typeof error === 'string') {
    return /transaction not confirmed|timed?\s*out|timeout/i.test(error);
  }
  if (typeof error === 'object') {
    const candidate = error as { message?: unknown; code?: unknown };
    if (
      typeof candidate.code === 'string' &&
      /timeout|ETIMEDOUT|ECONNABORTED|transaction_timeout/i.test(candidate.code)
    ) {
      return true;
    }
    if (
      typeof candidate.message === 'string' &&
      /transaction not confirmed|timed?\s*out|timeout/i.test(candidate.message)
    ) {
      return true;
    }
  }
  return false;
}

function withConfirmationTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new WalletConfirmationTimeoutError());
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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
  /** Maximum milliseconds to wait for on-chain/wallet confirmation before surfacing a timeout recovery UI. */
  timeoutMs?: number;
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
  timeoutMs = DEFAULT_WALLET_TIMEOUT_MS,
  confirmPayment,
  onSuccess,
  onError,
  onSheetOpenChange,
}: WalletPaymentButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const lastPaymentMethodRef = useRef<PaymentMethod | null>(null);

  // The Payment Request is created once per Stripe instance; later amount
  // changes go through `update()`, so keep the latest values in a ref.
  const latest = useRef({
    amount,
    label,
    timeoutMs,
    confirmPayment,
    onSuccess,
    onError,
    onSheetOpenChange,
  });
  latest.current = {
    amount,
    label,
    timeoutMs,
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
        timeoutMs: currentTimeoutMs,
        confirmPayment: confirm,
        onSuccess: succeed,
        onError: fail,
      } = latest.current;

      lastPaymentMethodRef.current = event.paymentMethod;
      setTimeoutError(null);
      setIsConfirming(true);

      try {
        await withConfirmationTimeout(confirm(event.paymentMethod), currentTimeoutMs);
        event.complete('success');
        setIsConfirming(false);
        setOpen(false);
        succeed(event.paymentMethod);
      } catch (error) {
        event.complete('fail');
        setIsConfirming(false);
        setOpen(false);
        if (isTransactionTimeoutError(error)) {
          const timeoutErr =
            error instanceof WalletConfirmationTimeoutError
              ? error
              : new WalletConfirmationTimeoutError();
          setTimeoutError(timeoutErr.message);
        }
        fail?.(error);
      }
    };
    const handleCancel = () => {
      setIsConfirming(false);
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

  const isPending = sheetOpen || isConfirming;

  const handleClick = (event: StripePaymentRequestButtonElementClickEvent) => {
    if (disabled || isPending) {
      event.preventDefault();
      return;
    }
    setTimeoutError(null);
    setOpen(true);
  };

  const handleRetry = async () => {
    const paymentMethod = lastPaymentMethodRef.current;
    setTimeoutError(null);
    if (!paymentMethod) return;

    setIsConfirming(true);
    setOpen(true);
    try {
      await withConfirmationTimeout(
        latest.current.confirmPayment(paymentMethod),
        latest.current.timeoutMs,
      );
      setIsConfirming(false);
      setOpen(false);
      latest.current.onSuccess(paymentMethod);
    } catch (error) {
      setIsConfirming(false);
      setOpen(false);
      if (isTransactionTimeoutError(error)) {
        const timeoutErr =
          error instanceof WalletConfirmationTimeoutError
            ? error
            : new WalletConfirmationTimeoutError();
        setTimeoutError(timeoutErr.message);
      }
      latest.current.onError?.(error);
    }
  };

  return (
    <div className="space-y-4" data-testid="wallet-payment">
      <div className={disabled && !isPending ? 'pointer-events-none opacity-60' : undefined}>
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '48px' } },
          }}
          onClick={handleClick}
        />
      </div>

      {isPending && (
        <p
          role="status"
          data-testid="wallet-pending-status"
          className="flex items-center justify-center gap-2 text-sm text-ink-600"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {isConfirming
            ? `Waiting for ${WALLET_LABELS[wallet]} confirmation…`
            : `Waiting for ${WALLET_LABELS[wallet]}…`}
        </p>
      )}

      {timeoutError && (
        <div
          role={onError ? 'status' : 'alert'}
          aria-live="polite"
          data-testid="wallet-timeout-error"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900"
        >
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="space-y-2">
              <p className="font-semibold">Transaction confirmation timed out</p>
              <p className="text-amber-800">{timeoutError}</p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry confirmation
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
