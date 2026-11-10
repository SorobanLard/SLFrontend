// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaderboardTable } from '../LeaderboardTable';

describe('LeaderboardTable empty, loading, and error states (#206)', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<LeaderboardTable entries={[]} isLoading />);
    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
  });

  it('renders error state with retry callback when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <LeaderboardTable
        entries={[]}
        error="Could not fetch leaderboard rankings"
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('leaderboard-error')).toBeInTheDocument();
    expect(screen.getByText('Could not fetch leaderboard rankings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when entries is empty', () => {
    render(<LeaderboardTable entries={[]} />);
    expect(screen.getByTestId('leaderboard-empty')).toBeInTheDocument();
    expect(screen.getByText('No rankings for this period yet')).toBeInTheDocument();
  });
});
