import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardResponse } from '@/types';
import LeaderboardPage from './page';

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/lib/api/services', () => ({
  leaderboardApi: { get },
}));

vi.mock('@/lib/hooks/use-auth-store', () => ({
  useAuthStore: () => ({ user: null }),
}));

const response: LeaderboardResponse = {
  period: 'week',
  currentUser: null,
  entries: [
    {
      userId: 'student-1',
      rank: 1,
      name: 'Amina Bello',
      avatarUrl: null,
      coursesCompleted: 8,
      hoursLearned: 24,
      streakDays: 12,
    },
    {
      userId: 'student-2',
      rank: 2,
      name: 'Kofi Mensah',
      avatarUrl: null,
      coursesCompleted: 6,
      hoursLearned: 18,
      streakDays: 9,
    },
    {
      userId: 'student-3',
      rank: 3,
      name: 'Lerato Ndlovu',
      avatarUrl: null,
      coursesCompleted: 4,
      hoursLearned: 13,
      streakDays: 7,
    },
  ],
};

describe('Leaderboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the leaderboard, podium, table, and period controls', async () => {
    get.mockResolvedValue(response);

    render(<LeaderboardPage />);

    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
    expect(
      screen.getByText('Top students ranked by courses completed, learning hours, and streak.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'This Week' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'This Month' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All Time' })).toBeInTheDocument();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Amina Bello')).toBeInTheDocument();
    expect(within(table).getByText('Kofi Mensah')).toBeInTheDocument();
    expect(within(table).getByText('Lerato Ndlovu')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Position 1' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('week');

    fireEvent.click(screen.getByRole('tab', { name: 'This Month' }));

    await waitFor(() => expect(get).toHaveBeenLastCalledWith('month'));
  });

  it('shows the empty leaderboard state when the response has no entries', async () => {
    get.mockResolvedValue({ ...response, entries: [] });

    render(<LeaderboardPage />);

    expect(await screen.findByText('No ranked learners yet.')).toBeInTheDocument();
    expect(screen.getByText('Complete a lesson or extend your streak to appear on the leaderboard.'))
      .toBeInTheDocument();
  });

  it('shows a loading indicator while the leaderboard request is pending', () => {
    get.mockReturnValue(new Promise(() => {}));

    render(<LeaderboardPage />);

    expect(screen.getByLabelText('Loading leaderboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('shows the error state and retries the failed request', async () => {
    get.mockRejectedValueOnce(new Error('Request failed')).mockResolvedValueOnce(response);

    render(<LeaderboardPage />);

    expect(await screen.findByText('Failed to load leaderboard. Please try again.'))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
