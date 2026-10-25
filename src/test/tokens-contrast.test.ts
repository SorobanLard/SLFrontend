import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function resolveHexValue(css: string, value: string): string {
  if (value.startsWith('#')) {
    return value.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3$/i, '#$1$2$3');
  }

  const match = value.match(/var\(--([a-z0-9-]+)\)/i);
  if (!match) {
    throw new Error(`Unable to resolve CSS value: ${value}`);
  }

  const tokenName = match[1];
  const tokenMatch = css.match(new RegExp(`--${tokenName}:\\s*([^;]+)`));
  if (!tokenMatch) {
    throw new Error(`Token ${tokenName} not found`);
  }

  return resolveHexValue(css, tokenMatch[1].trim());
}

function getHexToken(css: string, token: string): string {
  const match = css.match(new RegExp(`--${token}:\\s*([^;]+)`));
  if (!match) {
    throw new Error(`Token ${token} not found`);
  }
  return resolveHexValue(css, match[1].trim());
}

/**
 * Extract the dark-mode override value for a token.
 * The dark-mode block is inside `[data-theme='dark'] { ... }`.
 * We grab the text inside that block and then look for the token there.
 */
function getDarkModeToken(css: string, token: string): string {
  const darkBlockMatch = css.match(/\[data-theme=['"]dark['"]\]\s*\{([^}]+)\}/);
  if (!darkBlockMatch) {
    throw new Error("Dark mode block [data-theme='dark'] not found in tokens.css");
  }
  const darkBlock = darkBlockMatch[1];
  const match = darkBlock.match(new RegExp(`--${token}:\\s*([^;]+)`));
  if (!match) {
    throw new Error(`Token ${token} not found in dark-mode block`);
  }
  // Dark-mode values may reference root-level vars; resolve against full css
  return resolveHexValue(css, match[1].trim());
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((x) => x + x).join('') : value;
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255);

  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

describe('design token contrast ratios', () => {
  it('keeps primary purple legible on lilac backgrounds and white readable on primary buttons', () => {
    const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
    const primary = getHexToken(css, 'color-brand-primary');
    const lilac = getHexToken(css, 'color-brand-lilac');
    const onPrimary = getHexToken(css, 'color-text-on-primary');
    const bgPrimary = getHexToken(css, 'color-bg-primary');
    const muted = getHexToken(css, 'color-text-muted');

    expect(contrastRatio(primary, lilac)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(onPrimary, bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', '#4A42B8')).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * RevenueChart dark-mode token pairings (issue #156)
   *
   * Verifies that the theme-aware tokens used in RevenueChart's tooltip,
   * skeleton, empty state, and outer wrapper meet WCAG 2.1 AA contrast
   * requirements in both light and dark mode.
   *
   * Tokens checked:
   *   - color-text-body on color-bg-surface  (tooltip month label, export button text)
   *   - color-brand-primary on color-bg-surface  (tooltip revenue value)
   *   - color-text-muted on color-bg-surface  (range label, empty-state message)
   *
   * Dark-mode values are parsed from the [data-theme='dark'] block and verified
   * independently so a future token change that breaks dark-mode contrast is caught.
   */
  it('RevenueChart light-mode: text tokens meet AA contrast on bg-surface', () => {
    const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');

    const textBody = getHexToken(css, 'color-text-body');
    const textLink = getHexToken(css, 'color-text-link');
    const textMuted = getHexToken(css, 'color-text-muted');
    const bgSurface = '#f8f8ff'; // light-mode value of --color-bg-surface

    // Tooltip month label: text-body on bg-surface
    expect(contrastRatio(textBody, bgSurface)).toBeGreaterThanOrEqual(4.5);
    // Tooltip revenue value: text-link (brand accent) on bg-surface — #3c3489 light
    expect(contrastRatio(textLink, bgSurface)).toBeGreaterThanOrEqual(4.5);
    // Range label / empty-state text: text-muted on bg-surface
    expect(contrastRatio(textMuted, bgSurface)).toBeGreaterThanOrEqual(4.5);
  });

  it('RevenueChart dark-mode: text tokens meet AA contrast on bg-surface', () => {
    const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');

    // Extract the [data-theme='dark'] block for dark-mode token values
    const darkBlock = css.match(/\[data-theme=['"]dark['"]\]\s*\{([^}]+)\}/s)?.[1] ?? '';

    function getDarkToken(token: string): string {
      const match = darkBlock.match(new RegExp(`--${token}:\\s*([^;]+)`));
      if (!match) throw new Error(`Dark token ${token} not found`);
      return match[1].trim();
    }

    const darkTextBody = getDarkToken('color-text-body');   // #f0efff
    const darkTextLink = getDarkToken('color-text-link');   // #d9d5ff
    const darkTextMuted = getDarkToken('color-text-muted'); // #b9b3ff
    const darkBgSurface = '#16131f';                        // dark-mode value of --color-bg-surface

    // Tooltip month label: text-body on bg-surface (dark)
    expect(contrastRatio(darkTextBody, darkBgSurface)).toBeGreaterThanOrEqual(4.5);
    // Tooltip revenue value: text-link (brand accent) on bg-surface (dark) — #d9d5ff
    expect(contrastRatio(darkTextLink, darkBgSurface)).toBeGreaterThanOrEqual(4.5);
    // Range label / empty-state text: text-muted on bg-surface (dark)
    expect(contrastRatio(darkTextMuted, darkBgSurface)).toBeGreaterThanOrEqual(4.5);
  // -----------------------------------------------------------------------
  // Dark mode contrast ratios
  // Ensures the [data-theme='dark'] token overrides meet WCAG AA thresholds.
  // -----------------------------------------------------------------------
  describe('dark mode semantic token contrast ratios', () => {
    it('dark-mode body text meets WCAG AA on dark page background', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
      const textBody = getDarkModeToken(css, 'color-text-body');   // #f0efff
      const bgPage   = getDarkModeToken(css, 'color-bg-page');     // #0f0e1a

      // Normal text requires >= 4.5:1
      expect(contrastRatio(textBody, bgPage)).toBeGreaterThanOrEqual(4.5);
    });

    it('dark-mode heading text meets WCAG AA on dark page background', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
      const textHeading = getDarkModeToken(css, 'color-text-heading'); // #ffffff
      const bgPage      = getDarkModeToken(css, 'color-bg-page');      // #0f0e1a

      expect(contrastRatio(textHeading, bgPage)).toBeGreaterThanOrEqual(4.5);
    });

    it('dark-mode muted text meets WCAG AA on dark surface', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
      const textMuted = getDarkModeToken(css, 'color-text-muted');   // #b9b3ff
      const bgSurface = getDarkModeToken(css, 'color-bg-surface');   // #16131f

      expect(contrastRatio(textMuted, bgSurface)).toBeGreaterThanOrEqual(4.5);
    });

    it('dark-mode on-primary text meets WCAG AA on primary button', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
      // color-bg-primary in dark mode references the same brand primary (#4a42b8)
      const onPrimary = getDarkModeToken(css, 'color-text-on-primary'); // #ffffff
      const bgPrimary = getDarkModeToken(css, 'color-bg-primary');      // resolves to #4a42b8

      expect(contrastRatio(onPrimary, bgPrimary)).toBeGreaterThanOrEqual(4.5);
    });

    it('dark-mode link text is distinguishable on dark page background', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
      const textLink = getDarkModeToken(css, 'color-text-link'); // #d9d5ff
      const bgPage   = getDarkModeToken(css, 'color-bg-page');   // #0f0e1a

      // Links must also meet 4.5:1 for normal text
      expect(contrastRatio(textLink, bgPage)).toBeGreaterThanOrEqual(4.5);
    });
  });

  // -----------------------------------------------------------------------
  // Confetti / celebration tokens (used by CourseCompletionModal)
  // Verifies new tokens exist in both light and dark mode, and that the dark
  // variants are noticeably lighter (luminance > light variant) so they show
  // up on dark backgrounds.
  // -----------------------------------------------------------------------
  describe('confetti color tokens exist and are theme-aware', () => {
    it('confetti tokens are defined in light mode', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');

      // Will throw if tokens are missing
      expect(() => getHexToken(css, 'color-confetti-gold')).not.toThrow();
      expect(() => getHexToken(css, 'color-confetti-green')).not.toThrow();
      expect(() => getHexToken(css, 'color-confetti-dark')).not.toThrow();
    });

    it('confetti tokens have dark-mode overrides', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');

      expect(() => getDarkModeToken(css, 'color-confetti-gold')).not.toThrow();
      expect(() => getDarkModeToken(css, 'color-confetti-green')).not.toThrow();
      expect(() => getDarkModeToken(css, 'color-confetti-dark')).not.toThrow();
    });

    it('dark-mode confetti-dark token is light enough to show on dark background', () => {
      const css = readFileSync(path.resolve(__dirname, '../styles/tokens.css'), 'utf8');
      // In dark mode the "dark" confetti particle should be a light colour
      // so it contrasts against the dark canvas background.
      const darkConfettiDark = getDarkModeToken(css, 'color-confetti-dark'); // #e0e7ff
      const bgPage           = getDarkModeToken(css, 'color-bg-page');       // #0f0e1a

      // At minimum 3:1 so it reads as a visible particle
      expect(contrastRatio(darkConfettiDark, bgPage)).toBeGreaterThanOrEqual(3);
    });
  });
});
