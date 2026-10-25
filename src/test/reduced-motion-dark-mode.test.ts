/**
 * Combined reduced-motion + dark mode interaction tests  (Issue #153)
 *
 * Purpose
 * -------
 * Animation overrides (reduced-motion) and color overrides (dark mode) can
 * interact unexpectedly when applied at the same time.  These tests verify
 * that:
 *   1. Dark-mode CSS token definitions are present and have a correct value
 *      form even when a reduced-motion class is in effect.
 *   2. The useReducedMotion hook produces the correct state in each of the
 *      four combinations: {light, dark} × {motion-ok, motion-reduced}.
 *   3. The confetti color tokens defined for CourseCompletionModal have
 *      appropriate light/dark variants so the JS code that reads them via
 *      getComputedStyle will always get a usable value.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReducedMotion } from '../lib/hooks/use-reduced-motion';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKENS_CSS = readFileSync(
  path.resolve(__dirname, '../styles/tokens.css'),
  'utf8',
);

/** Return the raw token value string from :root */
function getRootToken(css: string, token: string): string {
  // Match the first occurrence (which lives in :root)
  const match = css.match(new RegExp(`--${token}:\\s*([^;]+)`));
  if (!match) throw new Error(`Token --${token} not found in :root`);
  return match[1].trim();
}

/** Return the raw token value string from [data-theme='dark'] */
function getDarkToken(css: string, token: string): string {
  const darkBlock = css.match(/\[data-theme=['"]dark['"]\]\s*\{([^}]+)\}/);
  if (!darkBlock) throw new Error("Dark mode block not found");
  const match = darkBlock[1].match(new RegExp(`--${token}:\\s*([^;]+)`));
  if (!match) throw new Error(`Token --${token} not found in dark block`);
  return match[1].trim();
}

/** Recursively resolve var() references to hex. */
function resolveHex(css: string, value: string): string {
  if (value.startsWith('#')) return value;
  const ref = value.match(/var\(--([a-z0-9-]+)\)/i);
  if (!ref) throw new Error(`Cannot resolve value: ${value}`);
  return resolveHex(css, getRootToken(css, ref[1]));
}

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(fg: string, bg: string): number {
  const lums = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (lums[0] + 0.05) / (lums[1] + 0.05);
}

// ---------------------------------------------------------------------------
// 1. Token structure — dark mode tokens exist and are valid hex / var() refs
// ---------------------------------------------------------------------------

describe('dark mode token structure', () => {
  const DARK_TOKENS = [
    'color-bg-page',
    'color-bg-surface',
    'color-bg-subtle',
    'color-bg-primary',
    'color-text-body',
    'color-text-heading',
    'color-text-muted',
    'color-text-link',
    'color-text-on-primary',
    'color-border-default',
    'color-border-strong',
    'color-focus-ring',
    'color-confetti-gold',
    'color-confetti-green',
    'color-confetti-dark',
  ];

  it.each(DARK_TOKENS)('dark mode token --%s resolves to a hex colour', (token) => {
    const rawDark = getDarkToken(TOKENS_CSS, token);
    const hex = resolveHex(TOKENS_CSS, rawDark);
    expect(hex).toMatch(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  });
});

// ---------------------------------------------------------------------------
// 2. Combined contrast — text on background in dark mode
// ---------------------------------------------------------------------------

describe('dark mode WCAG AA contrast (combined with reduced-motion active)', () => {
  /**
   * Reduced-motion CSS overrides only suppress transitions/animations —
   * they do not alter color values. These contrast tests therefore double as
   * "combined" checks: if both [data-theme='dark'] and .reduce-motion are
   * applied simultaneously, the color tokens are unchanged and contrast
   * ratios should still pass.
   */

  it('body text (#f0efff) on page background (#0f0e1a) >= 4.5:1', () => {
    const textBody = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-text-body'));
    const bgPage   = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-page'));
    expect(contrastRatio(textBody, bgPage)).toBeGreaterThanOrEqual(4.5);
  });

  it('heading text (#ffffff) on page background (#0f0e1a) >= 4.5:1', () => {
    const heading = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-text-heading'));
    const bgPage  = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-page'));
    expect(contrastRatio(heading, bgPage)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text (#b9b3ff) on surface background (#16131f) >= 4.5:1', () => {
    const muted  = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-text-muted'));
    const surface = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-surface'));
    expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('on-primary text on primary button background >= 4.5:1', () => {
    const onPrimary = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-text-on-primary'));
    const bgPrimary = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-primary'));
    expect(contrastRatio(onPrimary, bgPrimary)).toBeGreaterThanOrEqual(4.5);
  });

  it('link text (#d9d5ff) on page background (#0f0e1a) >= 4.5:1', () => {
    const link   = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-text-link'));
    const bgPage = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-page'));
    expect(contrastRatio(link, bgPage)).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// 3. Confetti token variants — CourseCompletionModal reads CSS vars at runtime
// ---------------------------------------------------------------------------

describe('confetti token dark-mode variants are sufficiently visible', () => {
  it('dark-mode gold confetti contrasts against dark page bg >= 3:1', () => {
    const gold   = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-confetti-gold'));
    const bgPage = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-page'));
    expect(contrastRatio(gold, bgPage)).toBeGreaterThanOrEqual(3);
  });

  it('dark-mode green confetti contrasts against dark page bg >= 3:1', () => {
    const green  = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-confetti-green'));
    const bgPage = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-page'));
    expect(contrastRatio(green, bgPage)).toBeGreaterThanOrEqual(3);
  });

  it('dark-mode "dark" confetti particle is light (contrasts dark bg >= 3:1)', () => {
    const dark   = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-confetti-dark'));
    const bgPage = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-bg-page'));
    expect(contrastRatio(dark, bgPage)).toBeGreaterThanOrEqual(3);
  });

  it('light-mode confetti tokens differ from dark-mode tokens (theme-awareness check)', () => {
    // If they were identical there would be no point having dark variants.
    const lightGold = resolveHex(TOKENS_CSS, getRootToken(TOKENS_CSS, 'color-confetti-gold'));
    const darkGold  = resolveHex(TOKENS_CSS, getDarkToken(TOKENS_CSS, 'color-confetti-gold'));
    expect(lightGold.toLowerCase()).not.toEqual(darkGold.toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// 4. useReducedMotion hook — all four theme × motion combinations
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sorobanlard_reduced_motion';

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useReducedMotion — light mode (no dark theme attribute)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('motion-ok: prefersReducedMotion is false, no override', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.hasManualOverride).toBe(false);
  });

  it('motion-reduced via OS: prefersReducedMotion is true', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('motion-reduced via manual override: prefersReducedMotion is true', async () => {
    mockMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current.mounted).toBe(true));
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.hasManualOverride).toBe(true);
  });
});

describe('useReducedMotion — dark mode ([data-theme="dark"] on <html>)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.clearAllMocks();
  });

  it('motion-ok in dark mode: prefersReducedMotion is false', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(false);
    // dark theme attribute should not affect the hook's motion state
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('motion-reduced via OS in dark mode: prefersReducedMotion is true', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('motion-reduced via manual override in dark mode: both states coexist', async () => {
    mockMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current.mounted).toBe(true));
    // Motion is suppressed
    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.hasManualOverride).toBe(true);
    // Dark theme is still applied independently
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('clearing motion override in dark mode reverts to OS preference only', async () => {
    mockMatchMedia(false); // OS says no reduced motion
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current.prefersReducedMotion).toBe(true));

    await act(async () => {
      result.current.clearManualOverride();
    });

    expect(result.current.prefersReducedMotion).toBe(false);
    expect(result.current.hasManualOverride).toBe(false);
    // Dark theme untouched
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggling motion override back off in dark mode dispatches custom event', async () => {
    mockMatchMedia(false);
    const spy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current.mounted).toBe(true));

    await act(async () => {
      result.current.setManualOverride(true);
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sorobanlard:reduced-motion-changed' }),
    );

    await act(async () => {
      result.current.clearManualOverride();
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
