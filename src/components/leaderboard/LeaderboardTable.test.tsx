import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardTable } from './LeaderboardTable';

// Mock the lib/utils module to keep assertions focused on behaviour
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockEntries = [
  {
    rank: 1,
    userId: 'user-1',
    name: 'Alice Johnson',
    avatarUrl: 'https://example.com/alice.jpg',
    xp: 12500,
    streak: 30,
  },
  {
    rank: 2,
    userId: 'user-2',
    name: 'Bob Smith',
    avatarUrl: null,
    xp: 9800,
    streak: 12,
  },
  {
    rank: 3,
    userId: 'user-3',
    name: 'Carol White',
    avatarUrl: null,
    xp: 7400,
    streak: 5,
  },
];

describe('LeaderboardTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('renders a loading indicator when loading is true', () => {
      render(<LeaderboardTable entries={[]} loading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render entries while loading', () => {
      render(<LeaderboardTable entries={mockEntries} loading={true} />);
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders an empty message when there are no entries', () => {
      render(<LeaderboardTable entries={[]} />);
      expect(screen.getByText(/no .*yet/i)).toBeInTheDocument();
    });
  });

  describe('Populated state', () => {
    it('renders a row for each entry', () => {
      render(<LeaderboardTable entries={mockEntries} />);
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
    });

    it('renders the rank for each entry', () => {
      render(<LeaderboardTable entries={mockEntries} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders the xp for each entry', () => {
      render(<LeaderboardTable entries={mockEntries} />);
      expect(screen.getByText(/12,500/)).toBeInTheDocument();
      expect(screen.getByText(/9,800/)).toBeInTheDocument();
    });

    it('renders a table with accessible column headers', () => {
      render(<LeaderboardTable entries={mockEntries} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /rank/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls onRowClick with the entry when a row is clicked', () => {
      const onRowClick = vi.fn();
      render(<LeaderboardTable entries={mockEntries} onRowClick={onRowClick} />);
      fireEvent.click(screen.getByText('Alice Johnson'));
      expect(onRowClick).toHaveBeenCalledWith(mockEntries[0]);
    });
  });
});
