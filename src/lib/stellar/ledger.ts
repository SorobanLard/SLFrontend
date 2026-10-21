/**
 * lib/stellar/ledger.ts
 *
 * Validation helpers for deposit-by-ledger operations on Stellar/Soroban.
 *
 * Stellar produces a new ledger roughly every 5 seconds. A minimum gap of 12
 * ledgers (~60 s) is required between the current ledger and the unlock ledger
 * to prevent locks that are too short to be meaningful.
 */

/** Minimum number of ledgers required between current and unlock ledger. */
export const MIN_LEDGER_GAP = 12;

/** Approximate seconds per Stellar ledger. */
export const SECONDS_PER_LEDGER = 5;

export interface LedgerGapValidationResult {
  /** Whether the gap satisfies the minimum requirement. */
  valid: boolean;
  /** Human-readable reason when `valid` is false. */
  error?: string;
  /** Actual gap between current and unlock ledger. */
  gap?: number;
}

/**
 * Validates that the unlock ledger is at least `MIN_LEDGER_GAP` ledgers ahead
 * of the current ledger.
 *
 * Rules:
 * - Both `currentLedger` and `unlockLedger` must be positive integers.
 * - `unlockLedger` must be strictly greater than `currentLedger`.
 * - The gap (`unlockLedger - currentLedger`) must be >= `MIN_LEDGER_GAP` (12).
 *
 * @param currentLedger  The ledger sequence number at submission time.
 * @param unlockLedger   The ledger sequence number at which the deposit unlocks.
 * @returns              A `LedgerGapValidationResult` with `valid`, and on
 *                       failure an `error` message and the computed `gap`.
 */
export function validateLedgerGap(
  currentLedger: number,
  unlockLedger: number,
): LedgerGapValidationResult {
  if (!Number.isInteger(currentLedger) || currentLedger <= 0) {
    return {
      valid: false,
      error: 'currentLedger must be a positive integer.',
    };
  }

  if (!Number.isInteger(unlockLedger) || unlockLedger <= 0) {
    return {
      valid: false,
      error: 'unlockLedger must be a positive integer.',
    };
  }

  const gap = unlockLedger - currentLedger;

  if (gap < MIN_LEDGER_GAP) {
    const minApproxSeconds = MIN_LEDGER_GAP * SECONDS_PER_LEDGER;
    return {
      valid: false,
      error:
        `Unlock ledger must be at least ${MIN_LEDGER_GAP} ledgers ahead of the current ledger ` +
        `(~${minApproxSeconds} seconds). Got a gap of ${gap}.`,
      gap,
    };
  }

  return { valid: true, gap };
}
