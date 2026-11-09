import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaderboardTable } from './LeaderboardTable';
import type { LeaderboardEntry } from '@/types';

const sampleEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: 'u-1',
    name: 'Adaobi Okafor',
    avatarUrl: null,
    coursesCompleted: 12,
    hoursLearned: 48,
    streakDays: 14,
  },
  {
    rank: 2,
    userId: 'u-2',
    name: 'Chidi Nwosu',
    avatarUrl: 'https://example.com/chidi.jpg',
    coursesCompleted: 9,
    hoursLearned: 35,
    streakDays: 7,
  },
];

describe('LeaderboardTable states (Issue #206)', () => {
  it('renders a distinct loading state before leaderboard data arrives', () => {
    render(<LeaderboardTable entries={[]} loading />);

    const loadingRegion = screen.getByTestId('leaderboard-loading');
    expect(loadingRegion).toBeInTheDocument();
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/loading leaderboard rankings/i)).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-empty')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a distinct error state with a retry button that triggers onRetry', () => {
    const onRetry = vi.fn();
    render(
      <LeaderboardTable
        entries={[]}
        error="Failed to load leaderboard. Please try again."
        onRetry={onRetry}
      />,
    );

    const errorAlert = screen.getByTestId('leaderboard-error');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(/unable to load leaderboard/i);
    expect(errorAlert).toHaveTextContent(/failed to load leaderboard/i);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('leaderboard-empty')).not.toBeInTheDocument();
  });

  it('renders a dedicated empty state when there are no ranked users yet', () => {
    render(<LeaderboardTable entries={[]} />);

    const emptyState = screen.getByTestId('leaderboard-empty');
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText(/no ranked students yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no data for this period yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders ranked student entries and highlights the current user when populated', () => {
    render(
      <LeaderboardTable
        entries={sampleEntries}
        currentUserId="u-1"
        currentUserEntry={sampleEntries[0]}
      />,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Adaobi Okafor')).toBeInTheDocument();
    expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gold medal' })).toBeInTheDocument();
  });
});
