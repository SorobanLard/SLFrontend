import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StudyReminder } from './StudyReminder';

// ── Mock useToast ──────────────────────────────────────────────────────────

const mockToast = {
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => mockToast,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sorobanlard_study_reminder';

function renderReminder() {
  return render(<StudyReminder />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('StudyReminder', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Default: Notification API present, permission not yet decided
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Object.assign(
        vi.fn().mockImplementation(() => ({})),
        {
          permission: 'default' as NotificationPermission,
          requestPermission: vi.fn().mockResolvedValue('granted' as NotificationPermission),
        },
      ),
    });
  });

  // ── Static rendering ─────────────────────────────────────────────────────

  describe('initial render', () => {
    it('renders the section heading', () => {
      renderReminder();
      expect(screen.getByRole('heading', { name: /study reminders/i })).toBeInTheDocument();
    });

    it('renders the enable toggle labelled correctly', () => {
      renderReminder();
      expect(
        screen.getByRole('checkbox', { name: /enable study reminders/i }),
      ).toBeInTheDocument();
    });

    it('defaults to reminders off', () => {
      renderReminder();
      expect(
        screen.getByRole('checkbox', { name: /enable study reminders/i }),
      ).not.toBeChecked();
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('renders Mon, Wed, Fri pre-selected by default', () => {
      renderReminder();
      expect(screen.getByRole('button', { name: /mon/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /wed/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /fri/i })).toHaveAttribute('aria-pressed', 'true');

      expect(screen.getByRole('button', { name: /sun/i })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /tue/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders the time input pre-set to 09:00', () => {
      renderReminder();
      expect(screen.getByLabelText(/^time$/i)).toHaveValue('09:00');
    });

    it('renders the reminder message textarea', () => {
      renderReminder();
      expect(screen.getByLabelText(/reminder message/i)).toBeInTheDocument();
    });

    it('renders the Save reminder button', () => {
      renderReminder();
      expect(screen.getByRole('button', { name: /save reminder/i })).toBeInTheDocument();
    });

    it('shows character count for the message', () => {
      renderReminder();
      // Default message is the placeholder; the textarea starts with its value
      const textarea = screen.getByLabelText(/reminder message/i) as HTMLTextAreaElement;
      expect(
        screen.getByText(`${textarea.value.length}/140 characters`),
      ).toBeInTheDocument();
    });
  });

  // ── Hydration from localStorage ──────────────────────────────────────────

  describe('hydration from localStorage', () => {
    it('restores a saved schedule on mount', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: true, days: ['Tue', 'Thu'], time: '18:30', message: 'Keep going!' }),
      );

      renderReminder();

      expect(
        screen.getByRole('checkbox', { name: /enable study reminders/i }),
      ).toBeChecked();
      expect(screen.getByRole('button', { name: /tue/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /thu/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /mon/i })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByLabelText(/^time$/i)).toHaveValue('18:30');
      expect(screen.getByLabelText(/reminder message/i)).toHaveValue('Keep going!');
    });
  });

  // ── Enable / disable toggle ──────────────────────────────────────────────

  describe('enable toggle', () => {
    it('switches label to "On" after enabling', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));

      expect(screen.getByText('On')).toBeInTheDocument();
    });

    it('shows the notification-permission prompt when enabled and permission is default', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));

      expect(screen.getByText(/allow browser notifications/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /grant permission/i }),
      ).toBeInTheDocument();
    });

    it('hides the notification-permission prompt when reminders are off', () => {
      renderReminder();
      // Default is off — the prompt must not appear
      expect(screen.queryByText(/allow browser notifications/i)).not.toBeInTheDocument();
    });

    it('greys out the form controls when reminders are disabled', () => {
      renderReminder();
      const formArea = screen.getByRole('group', { name: /reminder days/i }).closest('div')!;
      expect(formArea.closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ── Notification permission warning ──────────────────────────────────────

  describe('notification-blocked banner', () => {
    it('shows the blocked banner when Notification permission is denied', () => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: Object.assign(vi.fn(), {
          permission: 'denied' as NotificationPermission,
          requestPermission: vi.fn(),
        }),
      });

      renderReminder();

      expect(screen.getByText(/browser notifications are blocked/i)).toBeInTheDocument();
    });

    it('does not show the blocked banner when permission is granted', () => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        writable: true,
        value: Object.assign(vi.fn(), {
          permission: 'granted' as NotificationPermission,
          requestPermission: vi.fn(),
        }),
      });

      renderReminder();

      expect(screen.queryByText(/browser notifications are blocked/i)).not.toBeInTheDocument();
    });
  });

  // ── Day toggles ──────────────────────────────────────────────────────────

  describe('day selection', () => {
    it('deselects a day when clicked while selected', async () => {
      const user = userEvent.setup();
      renderReminder();

      const monBtn = screen.getByRole('button', { name: /mon/i });
      expect(monBtn).toHaveAttribute('aria-pressed', 'true');

      await user.click(monBtn);

      expect(monBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('selects a day when clicked while unselected', async () => {
      const user = userEvent.setup();
      renderReminder();

      const satBtn = screen.getByRole('button', { name: /sat/i });
      expect(satBtn).toHaveAttribute('aria-pressed', 'false');

      await user.click(satBtn);

      expect(satBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders all seven day buttons', () => {
      renderReminder();
      const group = screen.getByRole('group', { name: /reminder days/i });
      expect(group.querySelectorAll('button')).toHaveLength(7);
    });
  });

  // ── Time input ───────────────────────────────────────────────────────────

  describe('time input', () => {
    it('updates the displayed time when the user changes it', async () => {
      const user = userEvent.setup();
      renderReminder();

      const timeInput = screen.getByLabelText(/^time$/i);
      await user.clear(timeInput);
      await user.type(timeInput, '14:30');

      expect(timeInput).toHaveValue('14:30');
    });
  });

  // ── Message textarea ─────────────────────────────────────────────────────

  describe('reminder message', () => {
    it('updates character count as the user types', async () => {
      const user = userEvent.setup();
      renderReminder();

      const textarea = screen.getByLabelText(/reminder message/i);

      // Clear the existing default message first
      await user.clear(textarea);
      await user.type(textarea, 'Hello');

      expect(screen.getByText('5/140 characters')).toBeInTheDocument();
    });
  });

  // ── Save flow ────────────────────────────────────────────────────────────

  describe('save reminder', () => {
    it('persists the schedule to localStorage on save', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      expect(stored).not.toBeNull();
      expect(stored).toMatchObject({ enabled: false, time: '09:00' });
    });

    it('fires a success toast on save', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Reminder saved' }),
      );
    });

    it('shows a success toast describing the off state when reminders are disabled', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Study reminders are turned off.' }),
      );
    });

    it('shows a success toast listing days and time when reminders are enabled', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));

      // Stub requestPermission so it resolves immediately
      window.Notification.requestPermission = vi.fn().mockResolvedValue('granted');

      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringMatching(/Mon.*Wed.*Fri/),
          }),
        );
      });
    });

    it('switches button label to "Saved!" immediately after saving', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      // The saved state appears synchronously right after the click
      expect(screen.getByRole('button', { name: /saved!/i })).toBeInTheDocument();
    });

    it('reverts "Saved!" back to "Save reminder" after 2.5 s', async () => {
      const user = userEvent.setup();
      renderReminder();

      await user.click(screen.getByRole('button', { name: /save reminder/i }));
      expect(screen.getByRole('button', { name: /saved!/i })).toBeInTheDocument();

      // Wait for the 2500 ms internal timeout to fire (real timers, generous waitFor timeout)
      await waitFor(
        () => expect(screen.getByRole('button', { name: /save reminder/i })).toBeInTheDocument(),
        { timeout: 4000 },
      );
    });

    it('requests notification permission when enabling for the first time', async () => {
      const user = userEvent.setup();
      const requestPermission = vi.fn().mockResolvedValue('granted');
      window.Notification.requestPermission = requestPermission;

      renderReminder();

      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));
      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      await waitFor(() => {
        expect(requestPermission).toHaveBeenCalled();
      });
    });

    it('shows a warning toast when the user denies notification permission', async () => {
      const user = userEvent.setup();
      window.Notification.requestPermission = vi.fn().mockResolvedValue('denied');

      renderReminder();

      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));
      await user.click(screen.getByRole('button', { name: /save reminder/i }));

      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Notifications blocked' }),
        );
      });
    });
  });

  // ── Grant permission inline button ───────────────────────────────────────

  describe('"Grant permission" inline button', () => {
    it('calls requestPermission when clicked', async () => {
      const user = userEvent.setup();
      const requestPermission = vi.fn().mockResolvedValue('granted');
      window.Notification.requestPermission = requestPermission;

      renderReminder();

      // Enable reminders to surface the prompt
      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));
      await user.click(screen.getByRole('button', { name: /grant permission/i }));

      expect(requestPermission).toHaveBeenCalledOnce();
    });

    it('hides the permission prompt after permission is granted', async () => {
      const user = userEvent.setup();
      window.Notification.requestPermission = vi.fn().mockResolvedValue('granted');

      renderReminder();

      await user.click(screen.getByRole('checkbox', { name: /enable study reminders/i }));
      await user.click(screen.getByRole('button', { name: /grant permission/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /grant permission/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('the day group has an accessible label', () => {
      renderReminder();
      expect(
        screen.getByRole('group', { name: /reminder days/i }),
      ).toBeInTheDocument();
    });

    it('each day button reports its pressed state via aria-pressed', () => {
      renderReminder();
      const dayButtons = screen
        .getByRole('group', { name: /reminder days/i })
        .querySelectorAll('button');
      dayButtons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed');
      });
    });

    it('the enable checkbox has an accessible label', () => {
      renderReminder();
      expect(
        screen.getByRole('checkbox', { name: /enable study reminders/i }),
      ).toBeInTheDocument();
    });
  });
});
