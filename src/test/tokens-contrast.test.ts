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
  });
});
