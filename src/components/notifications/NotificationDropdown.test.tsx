// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotificationStore } from '@/lib/hooks/use-notification-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('NotificationDropdown states (#201)', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      loading: false,
      fetched: true,
      error: null,
    });
  });

  it('renders loading state when notifications are being fetched', () => {
    useNotificationStore.setState({
      notifications: [],
      loading: true,
      fetched: false,
      error: null,
    });

    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByTestId('notifications-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading notifications/i)).toBeInTheDocument();
  });

  it('renders error state with retry action when notifications API request fails', () => {
    const fetchNotifications = vi.fn().mockResolvedValue(undefined);
    useNotificationStore.setState({
      notifications: [],
      loading: false,
      fetched: true,
      error: 'Notifications service unavailable (502).',
      fetchNotifications,
    });

    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByTestId('notifications-error')).toBeInTheDocument();
    expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
    expect(
      screen.getByText(/notifications service unavailable \(502\)/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when user has no notifications', () => {
    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByTestId('notifications-empty')).toBeInTheDocument();
    expect(screen.getByText(/you're all caught up!/i)).toBeInTheDocument();
  });

  it('renders populated notification items when notifications exist', () => {
    useNotificationStore.setState({
      notifications: [
        {
          id: 'notif-1',
          type: 'ENROLLMENT_CONFIRMED',
          title: 'Enrollment Confirmed',
          message: 'Welcome to Soroban 101.',
          data: { courseId: 'c-1' },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      loading: false,
      fetched: true,
      error: null,
    });

    render(<NotificationDropdown />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText('Enrollment Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Soroban 101.')).toBeInTheDocument();
  });
});
