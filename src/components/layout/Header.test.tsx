/**
 * Header – mobile-menu accessible-toggle tests
 *
 * Covers the ARIA contract for the hamburger button ↔ mobile-nav-drawer pair:
 *   • aria-expanded reflects open/closed state
 *   • aria-controls points to the drawer's id
 *   • aria-hidden on the drawer mirrors the closed state
 *   • aria-label updates with open/closed state
 *   • drawer carries role="dialog", aria-modal="true", aria-label
 *   • keyboard: Escape closes the drawer and returns focus to the hamburger
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from './Header';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  pathname: '/',
  isConnected: false,
  user: null as null | {
    name: string;
    email: string;
    stellarAddress: string;
    avatarUrl: string | null;
  },
  cartCount: 0,
  logout: vi.fn(),
  getCategories: vi.fn().mockResolvedValue([]),
  listCourses: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/lib/hooks/use-auth-store', () => ({
  useAuthStore: () => ({
    isConnected: mocks.isConnected,
    user: mocks.user,
    logout: mocks.logout,
  }),
}));

vi.mock('@/lib/hooks/use-cart-store', () => ({
  useCartStore: (selector: (state: { getItemCount: () => number }) => number) =>
    selector({ getItemCount: () => mocks.cartCount }),
  useCartHydrated: () => true,
}));

vi.mock('@/lib/api/services', () => ({
  coursesApi: {
    getCategories: mocks.getCategories,
    list: mocks.listCourses,
  },
}));

vi.mock('@/components/notifications/NotificationDropdown', () => ({
  NotificationDropdown: () => <div>Notifications</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHamburger() {
  return screen.getByRole('button', { name: /open menu/i });
}

function getDrawer() {
  return document.getElementById('mobile-nav-drawer') as HTMLElement;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Header – mobile menu disclosure semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
    mocks.isConnected = false;
    mocks.user = null;
    mocks.cartCount = 0;
    mocks.getCategories.mockResolvedValue([]);
    mocks.listCourses.mockResolvedValue({ data: [] });
  });

  it('renders the hamburger as a <button> with type="button"', () => {
    render(<Header />);
    const btn = getHamburger();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('hamburger starts with aria-expanded="false" and aria-label="Open menu"', () => {
    render(<Header />);
    const btn = getHamburger();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('aria-label', 'Open menu');
  });

  it('aria-controls on the hamburger resolves to the drawer element', () => {
    render(<Header />);
    const btn = getHamburger();
    const panelId = btn.getAttribute('aria-controls');
    expect(panelId).toBe('mobile-nav-drawer');
    expect(document.getElementById(panelId!)).not.toBeNull();
  });

  it('drawer is in the DOM with role="dialog", aria-modal="true", and aria-label', () => {
    render(<Header />);
    const drawer = getDrawer();
    expect(drawer).toHaveAttribute('role', 'dialog');
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(drawer).toHaveAttribute('aria-label', 'Mobile navigation');
  });

  it('drawer has aria-hidden="true" when the menu is closed', () => {
    render(<Header />);
    expect(getDrawer()).toHaveAttribute('aria-hidden', 'true');
  });

  it('opening the menu sets aria-expanded="true", aria-label="Close menu", and removes aria-hidden from drawer', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hamburger = getHamburger();
    await user.click(hamburger);

    // The hamburger itself flips to "Close menu" with aria-expanded="true".
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
    expect(getDrawer()).toHaveAttribute('aria-hidden', 'false');
  });

  it('closing the menu restores aria-expanded="false", aria-label="Open menu", and sets aria-hidden="true"', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hamburger = getHamburger();

    // Open via hamburger.
    await user.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    // Close via hamburger again (it now reads "Close menu").
    await user.click(hamburger);

    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
    expect(getDrawer()).toHaveAttribute('aria-hidden', 'true');
  });

  it('Escape key closes the drawer, restores aria-expanded="false", and returns focus to the hamburger', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(getHamburger());
    expect(getDrawer()).toHaveAttribute('aria-hidden', 'false');

    await user.keyboard('{Escape}');

    expect(getDrawer()).toHaveAttribute('aria-hidden', 'true');
    expect(getHamburger()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(getHamburger());
  });

  it('the drawer contains a close button with aria-label="Close menu"', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(getHamburger());

    const drawer = getDrawer();
    const closeBtn = within(drawer).getByRole('button', { name: /close menu/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveAttribute('type', 'button');
  });

  it('mobile category toggle has aria-expanded and aria-controls wired to its panel', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(getHamburger());

    const drawer = getDrawer();
    const catToggle = within(drawer).getByRole('button', { name: /categories/i });
    expect(catToggle).toHaveAttribute('aria-expanded', 'false');
    expect(catToggle).toHaveAttribute('aria-controls', 'mobile-category-menu');

    await user.click(catToggle);
    expect(catToggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('mobile-category-menu')).not.toBeNull();
  });

  it('shows guest actions and marks the matching navigation route as current', () => {
    mocks.pathname = '/teach';
    render(<Header />);

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(
      screen.getByRole('link', { name: 'Teach on SorobanLard' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Team Plans' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows the signed-in user menu and logs out when requested', async () => {
    const user = userEvent.setup();
    mocks.isConnected = true;
    mocks.user = {
      name: 'Ada Learner',
      email: 'ada@example.com',
      stellarAddress: 'GABC',
      avatarUrl: null,
    };

    render(<Header />);

    expect(screen.getAllByText('Notifications')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: 'Shopping cart with 0 items' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByText('Ada Learner')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('announces the signed-in cart count and caps its visible badge at nine plus', () => {
    mocks.isConnected = true;
    mocks.cartCount = 12;

    render(<Header />);

    expect(
      screen.getByRole('link', { name: 'Shopping cart with 12 items' }),
    ).toBeInTheDocument();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('uses categories returned by the API in the mobile category menu', async () => {
    const user = userEvent.setup();
    mocks.getCategories.mockResolvedValue([{ name: 'Tailoring' }]);
    render(<Header />);

    await user.click(getHamburger());
    await user.click(within(getDrawer()).getByRole('button', { name: /categories/i }));

    const tailoring = await within(getDrawer()).findByRole('button', {
      name: /tailoring/i,
    });
    expect(tailoring).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(getDrawer()).getByRole('link', { name: 'All Tailoring courses' }),
    ).toHaveAttribute('href', '/categories/tailoring');
  });
});
