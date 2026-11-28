import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPage from './page';

const { getStatus, requestDataExport, toastSuccess, toastError } = vi.hoisted(() => ({
  getStatus: vi.fn(),
  requestDataExport: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api/services', () => ({
  twoFactorApi: {
    getStatus,
  },
  usersApi: {
    requestDataExport,
  },
}));

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
  }),
}));

vi.mock('@/lib/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => ({
    prefersReducedMotion: false,
    setManualOverride: vi.fn(),
    clearManualOverride: vi.fn(),
    hasManualOverride: false,
    mounted: true,
  }),
}));

vi.mock('@/components/auth/TwoFactorSetup', () => ({
  TwoFactorSetup: () => <div data-testid="two-factor-setup">TwoFactorSetup</div>,
}));

vi.mock('@/components/auth/DeleteAccountModal', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="Delete account modal">
        <button type="button" onClick={onClose}>
          Close delete modal
        </button>
      </div>
    ) : null,
}));

describe('Dashboard settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatus.mockResolvedValue({ enabled: false });
  });

  it('renders key settings sections, navigation links, and default preferences', async () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(
      screen.getByText('Notification, accessibility, and security preferences.'),
    ).toBeInTheDocument();
    const dashboardLinks = screen.getAllByRole('link', { name: 'Dashboard' });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    dashboardLinks.forEach((link) => expect(link).toHaveAttribute('href', '/dashboard'));

    // Notifications section
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    const emailCheckbox = screen.getByLabelText(/Email updates/i) as HTMLInputElement;
    const courseCheckbox = screen.getByLabelText(/Course updates/i) as HTMLInputElement;
    expect(emailCheckbox.checked).toBe(true);
    expect(courseCheckbox.checked).toBe(true);

    // Security section
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    const securityCheckbox = screen.getByLabelText(/Security alerts/i) as HTMLInputElement;
    expect(securityCheckbox.checked).toBe(true);

    // Two-Factor Authentication section
    expect(
      screen.getByRole('heading', { name: 'Two-Factor Authentication' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Disabled')).toBeInTheDocument();
    expect(screen.getByTestId('two-factor-setup')).toBeInTheDocument();
    expect(getStatus).toHaveBeenCalledTimes(1);

    // Payment methods link
    expect(screen.getByRole('link', { name: /Payment methods/i })).toHaveAttribute(
      'href',
      '/dashboard/settings/payment-methods',
    );

    // Danger zone section
    expect(screen.getByRole('heading', { name: 'Danger zone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete account/i })).toBeInTheDocument();
  });

  it('shows Enabled badge when two-factor authentication is enabled', async () => {
    getStatus.mockResolvedValue({ enabled: true });

    render(<SettingsPage />);

    expect(await screen.findByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
  });

  it('falls back to Disabled state when fetching 2FA status fails', async () => {
    getStatus.mockRejectedValue(new Error('Network error'));

    render(<SettingsPage />);

    expect(await screen.findByText('Disabled')).toBeInTheDocument();
    expect(screen.getByTestId('two-factor-setup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('toggles notification and security checkboxes and handles saving state', async () => {
    render(<SettingsPage />);
    await screen.findByText('Disabled');

    vi.useFakeTimers();
    try {

      const emailCheckbox = screen.getByLabelText(/Email updates/i) as HTMLInputElement;
      const courseCheckbox = screen.getByLabelText(/Course updates/i) as HTMLInputElement;
      const securityCheckbox = screen.getByLabelText(/Security alerts/i) as HTMLInputElement;

      fireEvent.click(emailCheckbox);
      fireEvent.click(courseCheckbox);
      fireEvent.click(securityCheckbox);

      expect(emailCheckbox.checked).toBe(false);
      expect(courseCheckbox.checked).toBe(false);
      expect(securityCheckbox.checked).toBe(false);

      const saveButton = screen.getByRole('button', { name: /Save settings/i });
      fireEvent.click(saveButton);

      expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(screen.getByRole('button', { name: /Save settings/i })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens and closes the delete account modal from the danger zone', async () => {
    render(<SettingsPage />);
    await screen.findByText('Disabled');

    expect(screen.queryByRole('dialog', { name: 'Delete account modal' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delete account/i }));
    expect(screen.getByRole('dialog', { name: 'Delete account modal' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close delete modal' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Delete account modal' }),
      ).not.toBeInTheDocument();
    });
  });
});
