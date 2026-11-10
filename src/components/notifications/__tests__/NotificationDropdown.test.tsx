// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDropdown } from '../NotificationDropdown';
import { useNotificationStore } from '@/lib/hooks/use-notification-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('NotificationDropdown loading, error, and empty states (#201)', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      loading: false,
      fetched: true,
      error: null,
    });
  });

  it('renders loading indicator when loading is true', () => {
    render(<NotificationDropdown defaultOpen isLoading />);
    expect(screen.getByTestId('notifications-loading')).toBeInTheDocument();
  });

  it('renders error state with retry action when notification feed fetch fails', () => {
    const onRetry = vi.fn();
    render(
      <NotificationDropdown
        defaultOpen
        error="Failed to connect to notification service"
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('notifications-error')).toBeInTheDocument();
    expect(
      screen.getByText('Failed to connect to notification service')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no notifications', () => {
    render(<NotificationDropdown defaultOpen />);
    expect(screen.getByTestId('notifications-empty')).toBeInTheDocument();
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });
});
