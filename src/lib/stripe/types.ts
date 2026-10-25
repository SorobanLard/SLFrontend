/**
 * Typed Stripe payment-intent and error objects.
 *
 * Stripe's SDK types most fields as `string`, which lets arbitrary values slip
 * through at compile time. The discriminated unions here narrow `code` and
 * `decline_code` to the values we actually handle so the compiler catches
 * unhandled cases, typos, and out-of-date message maps.
 */

// ── Decline codes ────────────────────────────────────────────────────────────

/**
 * Decline codes that arrive on `error.decline_code` when `error.code` is
 * `"card_declined"`. Only the codes mapped in `DECLINE_MESSAGES` are listed
 * here; add new members when you add a new message.
 */
export type StripeDeclineCode =
  | 'insufficient_funds'
  | 'lost_card'
  | 'stolen_card'
  | 'expired_card'
  | 'incorrect_cvc'
  | 'card_velocity_exceeded'
  | 'currency_not_supported'
  | 'do_not_honor'
  | 'transaction_not_allowed'
  | 'fraudulent'
  | 'generic_decline';

// ── Error codes ───────────────────────────────────────────────────────────────

/**
 * Error codes that arrive on `error.code`. These are used when there is no
 * more specific `decline_code`. Only the codes mapped in `CODE_MESSAGES` are
 * listed; extend when you add a new mapping.
 */
export type StripeErrorCode =
  | 'card_declined'
  | 'expired_card'
  | 'incorrect_cvc'
  | 'invalid_cvc'
  | 'incorrect_number'
  | 'invalid_number'
  | 'invalid_expiry_month'
  | 'invalid_expiry_year'
  | 'incomplete_number'
  | 'incomplete_expiry'
  | 'incomplete_cvc'
  | 'processing_error'
  | 'authentication_required'
  | 'rate_limit'
  | 'api_key_expired';

// ── Error types ───────────────────────────────────────────────────────────────

/**
 * Stripe error `type` values we branch on in `friendlyStripeError`.
 * `"card_error"` and `"validation_error"` are the learner-visible categories;
 * the others indicate infrastructure failures that should be hidden behind a
 * neutral message.
 */
export type StripeErrorType =
  | 'api_connection_error'
  | 'api_error'
  | 'authentication_error'
  | 'card_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'rate_limit_error'
  | 'validation_error';

// ── Typed error shape ─────────────────────────────────────────────────────────

/**
 * A narrowed view of a Stripe error object that replaces the SDK's broad
 * `string` fields with the discriminated union literals above. Consumers that
 * only need a subset of the fields can pick from this.
 */
export interface TypedStripeError {
  /** Broad error category. */
  type?: StripeErrorType;
  /** Machine-readable error code. */
  code?: StripeErrorCode;
  /**
   * Further classification available when `code` is `"card_declined"`.
   * Using a separate optional field (instead of a tagged union on `code`) keeps
   * this compatible with the raw Stripe SDK type while still narrowing the
   * string literal set.
   */
  decline_code?: StripeDeclineCode;
  /** Human-readable message from Stripe, used verbatim only for `validation_error`. */
  message?: string;
}

// ── Discriminated union for card-declined errors ───────────────────────────────

/**
 * A `card_declined` error *with* a decline code — the most common case when the
 * issuing bank provides a reason.
 */
export interface CardDeclinedWithCode extends TypedStripeError {
  code: 'card_declined';
  decline_code: StripeDeclineCode;
}

/**
 * A `card_declined` error *without* a specific decline code.
 */
export interface CardDeclinedGeneric extends TypedStripeError {
  code: 'card_declined';
  decline_code?: never;
}

/** Union of the two card-declined shapes. */
export type CardDeclinedError = CardDeclinedWithCode | CardDeclinedGeneric;

// ── PaymentIntent status ──────────────────────────────────────────────────────

/**
 * Possible statuses of a Stripe PaymentIntent.
 * Mirrors the values in the Stripe API reference.
 */
export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

/**
 * Minimal typed representation of a Stripe PaymentIntent returned by the
 * backend's `/checkout/intent` endpoint.
 *
 * Only the fields consumed by the frontend are included. Extend as the
 * PaymentIntent endpoint is built out.
 */
export interface TypedPaymentIntent {
  /** PaymentIntent id (`pi_…`). */
  id: string;
  /** The client secret used by Stripe.js to confirm the charge. */
  client_secret: string | null;
  /** Amount in the smallest currency unit (cents). */
  amount: number;
  /** Three-letter ISO currency code. */
  currency: string;
  /** Current lifecycle status. */
  status: PaymentIntentStatus;
}
