import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotificationStore } from '@/lib/hooks/use-notification-store';
import { notificationsApi } from '@/lib/api/services';
import type { Notification } from '@/types';

// The dropdown navigates on row click; no app router is mounted in unit tests.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

// Drive the real store (loading / error / data transitions) with a mocked API.
vi.mock('@/lib/api/services', () => ({
  notificationsApi: {
    list: vi.fn(),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
  },
}));

const listMock = notificationsApi.list as unknown as Mock<() => Promise<unknown>>;
const markReadMock = notificationsApi.markRead as unknown as Mock;
const markAllReadMock = notificationsApi.markAllRead as unknown as Mock;

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'ENROLLMENT_CONFIRMED',
    title: 'Enrollment Confirmed',
    message: 'You enrolled in a course',
    data: { courseId: 'course-1' },
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'COURSE_COMPLETED',
    title: 'Course Completed',
    message: 'You completed a course',
    data: { courseId: 'course-2' },
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

/** Opens the bell trigger and returns the panel dialog. */
function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /^notifications/i }));
  return screen.getByRole('dialog', { name: /notifications panel/i });
}

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      loading: false,
      fetched: false,
      error: null,
    });
  });

  it('shows a loading indicator while notifications are being fetched', async () => {
    listMock.mockReturnValueOnce(new Promise(() => {}));

    render(<NotificationDropdown />);
    const panel = openPanel();

    expect(await within(panel).findByRole('status', { name: /loading notifications/i })).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(panel).queryByText(/you're all caught up/i)).not.toBeInTheDocument();
  });

  it('shows an error with a retry action when the request fails', async () => {
    listMock.mockRejectedValueOnce(new Error('API request failed'));

    render(<NotificationDropdown />);
    const panel = openPanel();

    const alert = await within(panel).findByRole('alert');
    expect(within(alert).getByText(/failed to load notifications/i)).toBeInTheDocument();
    expect(within(alert).getByText(/api request failed/i)).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(within(panel).queryByText(/you're all caught up/i)).not.toBeInTheDocument();
  });

  it('retries the request and renders the feed when the retry succeeds', async () => {
    listMock
      .mockRejectedValueOnce(new Error('API request failed'))
      .mockResolvedValueOnce([mockNotifications[0]]);

    render(<NotificationDropdown />);
    const panel = openPanel();

    fireEvent.click(await within(panel).findByRole('button', { name: /retry/i }));

    expect(await within(panel).findByText('Enrollment Confirmed')).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state when the request succeeds with no notifications', async () => {
    listMock.mockResolvedValueOnce([]);

    render(<NotificationDropdown />);
    const panel = openPanel();

    expect(await within(panel).findByText(/you're all caught up/i)).toBeInTheDocument();
    expect(within(panel).getByText(/no notifications yet/i)).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('status', { name: /loading notifications/i })).not.toBeInTheDocument();
  });

  it('renders notifications with the unread count and mark-all-read action', async () => {
    listMock.mockResolvedValueOnce(mockNotifications);

    render(<NotificationDropdown />);
    const panel = openPanel();

    expect(await within(panel).findByText('Enrollment Confirmed')).toBeInTheDocument();
    expect(within(panel).getByText('Course Completed')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 unread/i })).toBeInTheDocument();
  });

  it('marks a single notification as read when its row is clicked', async () => {
    listMock.mockResolvedValueOnce(mockNotifications);

    render(<NotificationDropdown />);
    const panel = openPanel();

    fireEvent.click(await within(panel).findByText('Enrollment Confirmed'));

    expect(markReadMock).toHaveBeenCalledWith('1');
  });

  it('marks all notifications as read when the mark-all-read action is clicked', async () => {
    listMock.mockResolvedValueOnce(mockNotifications);

    render(<NotificationDropdown />);
    const panel = openPanel();

    fireEvent.click(await within(panel).findByRole('button', { name: /mark all read/i }));

    expect(markAllReadMock).toHaveBeenCalledTimes(1);
  });

  it('closes the panel when the trigger is clicked again', async () => {
    listMock.mockResolvedValueOnce(mockNotifications);

    render(<NotificationDropdown />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /^notifications/i }));

    expect(screen.queryByRole('dialog', { name: /notifications panel/i })).not.toBeInTheDocument();
  });
});
