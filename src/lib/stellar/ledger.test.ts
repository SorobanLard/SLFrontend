import { describe, expect, it } from 'vitest';
import {
  MIN_LEDGER_GAP,
  SECONDS_PER_LEDGER,
  validateLedgerGap,
} from './ledger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('ledger constants', () => {
  it('MIN_LEDGER_GAP is 12', () => {
    expect(MIN_LEDGER_GAP).toBe(12);
  });

  it('SECONDS_PER_LEDGER is 5', () => {
    expect(SECONDS_PER_LEDGER).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// validateLedgerGap — happy path
// ---------------------------------------------------------------------------

describe('validateLedgerGap — valid gaps', () => {
  it('returns valid=true when gap equals exactly MIN_LEDGER_GAP', () => {
    const result = validateLedgerGap(100, 112);
    expect(result.valid).toBe(true);
    expect(result.gap).toBe(12);
    expect(result.error).toBeUndefined();
  });

  it('returns valid=true when gap is greater than MIN_LEDGER_GAP', () => {
    const result = validateLedgerGap(100, 200);
    expect(result.valid).toBe(true);
    expect(result.gap).toBe(100);
  });

  it('handles large ledger numbers', () => {
    const result = validateLedgerGap(9_000_000, 9_000_020);
    expect(result.valid).toBe(true);
    expect(result.gap).toBe(20);
  });

  it('gap is exactly reported in the result', () => {
    const result = validateLedgerGap(50, 75);
    expect(result.gap).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// validateLedgerGap — gap too small
// ---------------------------------------------------------------------------

describe('validateLedgerGap — gap below minimum', () => {
  it('returns valid=false when gap is one short of minimum (gap=11)', () => {
    const result = validateLedgerGap(100, 111);
    expect(result.valid).toBe(false);
    expect(result.gap).toBe(11);
    expect(result.error).toBeDefined();
  });

  it('returns valid=false when gap is zero (same ledger)', () => {
    const result = validateLedgerGap(100, 100);
    expect(result.valid).toBe(false);
    expect(result.gap).toBe(0);
  });

  it('returns valid=false when unlockLedger is less than currentLedger (negative gap)', () => {
    const result = validateLedgerGap(200, 100);
    expect(result.valid).toBe(false);
    expect(result.gap).toBe(-100);
  });

  it('returns valid=false when gap is 1', () => {
    const result = validateLedgerGap(1, 2);
    expect(result.valid).toBe(false);
    expect(result.gap).toBe(1);
  });

  it('error message mentions MIN_LEDGER_GAP value', () => {
    const result = validateLedgerGap(100, 110);
    expect(result.error).toMatch(/12/);
  });

  it('error message mentions the approximate seconds (~60)', () => {
    const result = validateLedgerGap(100, 110);
    expect(result.error).toMatch(/60/);
  });

  it('error message reports the actual gap', () => {
    const result = validateLedgerGap(100, 107);
    expect(result.error).toMatch(/7/);
  });
});

// ---------------------------------------------------------------------------
// validateLedgerGap — invalid inputs
// ---------------------------------------------------------------------------

describe('validateLedgerGap — invalid currentLedger', () => {
  it('returns valid=false for currentLedger = 0', () => {
    const result = validateLedgerGap(0, 20);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/currentLedger/i);
  });

  it('returns valid=false for negative currentLedger', () => {
    const result = validateLedgerGap(-5, 20);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/currentLedger/i);
  });

  it('returns valid=false for fractional currentLedger', () => {
    const result = validateLedgerGap(1.5, 20);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/currentLedger/i);
  });

  it('returns valid=false for NaN currentLedger', () => {
    const result = validateLedgerGap(NaN, 20);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/currentLedger/i);
  });
});

describe('validateLedgerGap — invalid unlockLedger', () => {
  it('returns valid=false for unlockLedger = 0', () => {
    const result = validateLedgerGap(1, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unlockLedger/i);
  });

  it('returns valid=false for negative unlockLedger', () => {
    const result = validateLedgerGap(1, -10);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unlockLedger/i);
  });

  it('returns valid=false for fractional unlockLedger', () => {
    const result = validateLedgerGap(1, 14.9);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unlockLedger/i);
  });

  it('returns valid=false for NaN unlockLedger', () => {
    const result = validateLedgerGap(1, NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unlockLedger/i);
  });
});

// ---------------------------------------------------------------------------
// validateLedgerGap — boundary: gap = MIN_LEDGER_GAP - 1 vs MIN_LEDGER_GAP
// ---------------------------------------------------------------------------

describe('validateLedgerGap — boundary values', () => {
  it('gap of MIN_LEDGER_GAP - 1 (11) is invalid', () => {
    expect(validateLedgerGap(1, 1 + MIN_LEDGER_GAP - 1).valid).toBe(false);
  });

  it('gap of MIN_LEDGER_GAP (12) is valid', () => {
    expect(validateLedgerGap(1, 1 + MIN_LEDGER_GAP).valid).toBe(true);
  });

  it('gap of MIN_LEDGER_GAP + 1 (13) is valid', () => {
    expect(validateLedgerGap(1, 1 + MIN_LEDGER_GAP + 1).valid).toBe(true);
  });
});
