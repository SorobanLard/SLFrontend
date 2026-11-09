'use client';

import { AlertCircle, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

export interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  currentUserEntry?: LeaderboardEntry | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const MEDAL: Record<number, { emoji: string; label: string; rowClass: string; rankClass: string }> = {
  1: {
    emoji: '🥇',
    label: 'Gold medal',
    rowClass: 'bg-amber-50 border-amber-200',
    rankClass: 'text-amber-600 font-bold',
  },
  2: {
    emoji: '🥈',
    label: 'Silver medal',
    rowClass: 'bg-slate-50 border-slate-200',
    rankClass: 'text-slate-500 font-bold',
  },
  3: {
    emoji: '🥉',
    label: 'Bronze medal',
    rowClass: 'bg-orange-50 border-orange-200',
    rankClass: 'text-orange-500 font-bold',
  },
};

function Avatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Student avatar'}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-bold text-saffron-700"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function TableRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medal = MEDAL[entry.rank];

  return (
    <tr
      className={cn(
        'border-b transition-colors last:border-b-0',
        isCurrentUser
          ? 'border-[#D5D2F6] bg-[#F4F2FF]'
          : medal
            ? medal.rowClass + ' border-b'
            : 'border-ink-100 hover:bg-ink-50',
      )}
      aria-current={isCurrentUser ? 'true' : undefined}
    >
      {/* Rank */}
      <td className="py-3 pl-4 pr-2 text-center text-sm">
        {medal ? (
          <span role="img" aria-label={medal.label} className="text-lg leading-none">
            {medal.emoji}
          </span>
        ) : (
          <span className={cn('tabular-nums', isCurrentUser ? 'font-semibold text-[#3C3489]' : 'text-ink-500')}>
            {entry.rank}
          </span>
        )}
      </td>

      {/* Avatar + Name */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={entry.name} avatarUrl={entry.avatarUrl} />
          <div className="min-w-0">
            <p
              className={cn(
                'truncate text-sm font-medium',
                isCurrentUser ? 'text-[#26215C]' : 'text-ink-900',
              )}
            >
              {entry.name ?? 'Anonymous'}
              {isCurrentUser && (
                <span className="ml-1.5 rounded-full bg-[#7F77DD] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  You
                </span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Courses completed */}
      <td className="py-3 px-3 text-center text-sm tabular-nums text-ink-700">
        {entry.coursesCompleted}
      </td>

      {/* Hours learned */}
      <td className="py-3 px-3 text-center text-sm tabular-nums text-ink-700">
        {entry.hoursLearned}h
      </td>

      {/* Streak */}
      <td className="py-3 pl-3 pr-4 text-center text-sm tabular-nums text-ink-700">
        <span className="inline-flex items-center gap-1">
          🔥 {entry.streakDays}d
        </span>
      </td>
    </tr>
  );
}

export function LeaderboardTable({
  entries,
  currentUserId,
  currentUserEntry,
  loading = false,
  error = null,
  onRetry,
}: LeaderboardTableProps) {
  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        data-testid="leaderboard-loading"
        className="overflow-hidden rounded-2xl border border-ink-100 bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <Loader2
            className="h-6 w-6 animate-spin text-saffron-500"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-ink-600">Loading leaderboard rankings…</p>
        </div>
        <div className="mt-4 space-y-2.5" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-11 w-full animate-pulse rounded-xl bg-ink-50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        data-testid="leaderboard-error"
        className="overflow-hidden rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center shadow-sm"
      >
        <AlertCircle className="mx-auto mb-3 h-7 w-7 text-red-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-red-800">Unable to load leaderboard</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-secondary mt-4 inline-flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        role="status"
        data-testid="leaderboard-empty"
        className="overflow-hidden rounded-2xl border border-ink-100 bg-white px-6 py-14 text-center shadow-sm"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-50 text-saffron-600">
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-ink-900">No ranked students yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400">
          No data for this period yet. Keep learning and complete lessons to claim the top spot!
        </p>
      </div>
    );
  }

  const isCurrentUser = (entry: LeaderboardEntry) =>
    !!currentUserId && entry.userId === currentUserId;

  // Whether current user already appears in the top-10 list
  const currentUserInTable = currentUserEntry
    ? entries.some((e) => e.userId === currentUserEntry.userId)
    : false;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem]" role="table">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              <th
                scope="col"
                className="py-3 pl-4 pr-2 text-center text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Rank
              </th>
              <th
                scope="col"
                className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Student
              </th>
              <th
                scope="col"
                className="py-3 px-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Courses
              </th>
              <th
                scope="col"
                className="py-3 px-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Hours
              </th>
              <th
                scope="col"
                className="py-3 pl-3 pr-4 text-center text-xs font-semibold uppercase tracking-wider text-ink-400"
              >
                Streak
              </th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <TableRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={isCurrentUser(entry)}
              />
            ))}

            {/* Current user's row below the table if not in top 10 */}
            {currentUserEntry && !currentUserInTable && (
              <>
                {/* Separator */}
                <tr aria-hidden="true">
                  <td colSpan={5}>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <div className="h-px flex-1 border-t border-dashed border-ink-200" />
                      <span className="text-[11px] text-ink-400">your rank</span>
                      <div className="h-px flex-1 border-t border-dashed border-ink-200" />
                    </div>
                  </td>
                </tr>
                <TableRow entry={currentUserEntry} isCurrentUser />
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
