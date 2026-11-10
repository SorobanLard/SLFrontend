import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsentBanner } from './CookieConsentBanner';

const mockSuccessToast = vi.fn();

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    success: mockSuccessToast,
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const STORAGE_KEY = 'sorobanlard-cookie-consent';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSuccessToast.mockClear();
  });

  it('moves keyboard focus to the banner and exposes ARIA region/live attributes on mount', async () => {
    render(<CookieConsentBanner />);

    const banner = await screen.findByRole('region', { name: 'Cookie consent' });
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveAttribute('aria-describedby', 'cookie-consent-description');
    expect(banner).toHaveAttribute('tabindex', '-1');

    await waitFor(() => {
      expect(document.activeElement).toBe(banner);
    });
  });

  it('allows keyboard Tab navigation from the focused banner to interactive controls', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    const banner = await screen.findByRole('region', { name: 'Cookie consent' });
    await waitFor(() => {
      expect(document.activeElement).toBe(banner);
    });

    await user.tab();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Accept All' })).toHaveFocus();
  });

  it('does not render or steal focus when consent is already stored', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        acceptedAt: Date.now(),
        preferences: { necessary: true, analytics: false, marketing: false },
        version: 'v1',
      }),
    );

    render(<CookieConsentBanner />);
    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument();
  });

  it('saves preferences and dismisses the banner when Accept All is clicked', async () => {
    const user = userEvent.setup();
    render(<CookieConsentBanner />);

    await user.click(await screen.findByRole('button', { name: 'Accept All' }));

    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(mockSuccessToast).toHaveBeenCalledTimes(1);
  });
});
