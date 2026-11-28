import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieConsentBanner from './CookieConsentBanner';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the consent message and action buttons when no consent is stored', () => {
    render(<CookieConsentBanner />);

    expect(
      screen.getByText(/we use cookies/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /accept/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /decline/i })
    ).toBeInTheDocument();
  });

  it('does not render when consent has already been stored', () => {
    localStorage.setItem('cookie-consent', 'accepted');

    render(<CookieConsentBanner />);

    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('stores acceptance and hides the banner when Accept is clicked', () => {
    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));

    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('stores decline and hides the banner when Decline is clicked', () => {
    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    expect(localStorage.getItem('cookie-consent')).toBe('declined');
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });
});
