// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecentlyViewed } from '../RecentlyViewed';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

describe('RecentlyViewed empty, loading, and error states (#200)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      address: null,
      token: null,
      user: null,
      isConnected: false,
    });
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<RecentlyViewed isLoading />);
    expect(screen.getByTestId('recently-viewed-loading')).toBeInTheDocument();
  });

  it('renders error state with retry callback when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <RecentlyViewed
        error="Unable to load your recently viewed courses."
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('recently-viewed-error')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load your recently viewed courses.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when showEmptyState is true and no courses have been viewed', () => {
    render(<RecentlyViewed showEmptyState />);
    expect(screen.getByTestId('recently-viewed-empty')).toBeInTheDocument();
    expect(screen.getByText('No recently viewed courses yet')).toBeInTheDocument();
  });
});
