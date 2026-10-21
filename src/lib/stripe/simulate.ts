import type { PaymentMethod } from '@stripe/stripe-js';
import type { StripeDeclineCode, StripeErrorCode } from './types';

/**
 * Front-end-only stand-in for the confirmation step.
 *
 * Confirming a charge needs a PaymentIntent client secret from the backend,
 * which does not exist yet. Until it does, `PaymentForm` falls back to this so
 * the declined-card and success states are still reachable end to end: Stripe's
 * documented test cards are recognised by their last four digits and rejected
 * with the same shape a real confirmation error has.
 *
 * Swap it out by passing `onConfirmPayment` to `PaymentForm` once the
 * PaymentIntent endpoint lands.
 */

/**
 * Thrown by `simulatePaymentConfirmation` for a test card. Its `code` and `decline_code`
 * mirror the fields on a Stripe error, so `friendlyStripeError` handles both the same way.
 *
 * Using the discriminated-union literal types instead of plain `string` means the
 * compiler will catch any mismatch between the test-card table and the message maps.
 */
export class PaymentDeclinedError extends Error {
  readonly code: StripeErrorCode;
  readonly decline_code?: StripeDeclineCode;

  constructor(code: StripeErrorCode, declineCode?: StripeDeclineCode) {
    super(`Payment failed: ${declineCode ?? code}`);
    this.name = 'PaymentDeclinedError';
    this.code = code;
    this.decline_code = declineCode;
  }
}

/** https://docs.stripe.com/testing#declined-payments — keyed on the card's last4. */
const TEST_CARD_OUTCOMES: Record<
  string,
  { code: StripeErrorCode; declineCode?: StripeDeclineCode }
> = {
  '0002': { code: 'card_declined', declineCode: 'generic_decline' },
  '9995': { code: 'card_declined', declineCode: 'insufficient_funds' },
  '9987': { code: 'card_declined', declineCode: 'lost_card' },
  '9979': { code: 'card_declined', declineCode: 'stolen_card' },
  '0069': { code: 'expired_card' },
  '0127': { code: 'incorrect_cvc' },
  '0119': { code: 'processing_error' },
  '3220': { code: 'authentication_required' },
};

const PROCESSING_DELAY_MS = 1200;

/**
 * Stand-in for PaymentIntent confirmation. Waits about 1.2 seconds, then resolves for any card
 * except the Stripe test cards in `TEST_CARD_OUTCOMES`, which reject with `PaymentDeclinedError`.
 * It never contacts Stripe.
 */
export const simulatePaymentConfirmation = async (
  paymentMethod: PaymentMethod,
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS));

  const outcome = TEST_CARD_OUTCOMES[paymentMethod.card?.last4 ?? ''];
  if (outcome) throw new PaymentDeclinedError(outcome.code, outcome.declineCode);
};
