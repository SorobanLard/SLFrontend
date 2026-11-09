import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsentBanner } from './CookieConsentBanner';

const toastSuccessMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: vi.fn(),
  }),
}));

describe('CookieConsentBanner accessibility (Issue #216)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    toastSuccessMock.mockReset();
  });

  it('moves focus to the banner container on initial mount and announces via aria-live', () => {
    render(<CookieConsentBanner />);

    const banner = screen.getByRole('region', { name: 'Cookie consent' });
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveAttribute('aria-atomic', 'true');
    expect(banner).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(banner);
  });

  it('does not render or steal focus when consent is already stored in localStorage', () => {
    window.localStorage.setItem(
      'sorobanlard-cookie-consent',
      JSON.stringify({
        acceptedAt: Date.now(),
        preferences: { necessary: true, analytics: true, marketing: false },
        version: 'v1',
      }),
    );

    render(<CookieConsentBanner />);

    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument();
  });

  it('supports keyboard interaction for preferences modal and restores focus on Escape', () => {
    render(<CookieConsentBanner />);

    const manageButton = screen.getByRole('button', { name: 'Manage Preferences' });
    fireEvent.click(manageButton);

    const dialog = screen.getByRole('dialog', { name: 'Manage your consent preferences' });
    expect(dialog).toBeInTheDocument();
    expect(document.activeElement).toBe(dialog);

    const analyticsSwitch = screen.getByRole('switch', { name: 'Analytics' });
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(analyticsSwitch);
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(manageButton);
  });

  it('persists consent and hides the banner when Accept All is activated', () => {
    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Accept All' }));

    expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('sorobanlard-cookie-consent')).toContain('"analytics":true');
  });
});
