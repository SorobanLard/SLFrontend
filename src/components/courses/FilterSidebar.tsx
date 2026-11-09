'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PRICES = [
  { label: 'Free', value: 'free' },
  { label: 'Under $20', value: 'under20' },
  { label: '$20 – $50', value: '20to50' },
  { label: 'Over $50', value: 'over50' },
];

const RATINGS = [
  { label: '4.5 & up', value: '4.5' },
  { label: '4.0 & up', value: '4.0' },
  { label: '3.5 & up', value: '3.5' },
];

const DURATIONS = [
  { label: '0–2 hours', value: 'short' },
  { label: '3–6 hours', value: 'medium' },
  { label: '7+ hours', value: 'long' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  activeCategory: string;
  activeLevel: string;
  activePrice: string;
  activeRating?: string;
  activeDuration?: string;
  onCategory: (v: string) => void;
  onLevel: (v: string) => void;
  onPrice: (v: string) => void;
  onRating?: (v: string) => void;
  onDuration?: (v: string) => void;
  onClearAll: () => void;
}

export function FilterSidebar({
  open,
  onClose,
  categories,
  activeCategory,
  activeLevel,
  activePrice,
  activeRating = '',
  activeDuration = '',
  onCategory,
  onLevel,
  onPrice,
  onRating,
  onDuration,
  onClearAll,
}: Props) {
  const activeCount = [
    activeCategory,
    activeLevel,
    activePrice,
    activeRating,
    activeDuration,
  ].filter(Boolean).length;

  const hasFilters = activeCount > 0;

  const content = (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-ink-900">Filters</p>
          {activeCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-saffron-500 text-white text-xs font-semibold"
              aria-label={`${activeCount} active ${activeCount === 1 ? 'filter' : 'filters'}`}
            >
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-saffron-600 font-medium hover:underline"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-ink-50 text-ink-400"
            aria-label="Close filters"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
          Category
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onCategory('')}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
              !activeCategory
                ? 'bg-saffron-50 text-saffron-700 font-medium'
                : 'text-ink-600 hover:bg-ink-50',
            )}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.name}
              onClick={() => onCategory(c.name)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between gap-2 min-w-0',
                activeCategory === c.name
                  ? 'bg-saffron-50 text-saffron-700 font-medium'
                  : 'text-ink-600 hover:bg-ink-50',
              )}
            >
              <span className="truncate">{c.name}</span>
              <span className="text-xs text-ink-400 shrink-0">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
          Level
        </p>
        <div className="space-y-1">
          {LEVELS.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => onLevel(activeLevel === l ? '' : l)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
                activeLevel === l
                  ? 'bg-saffron-50 text-saffron-700 font-medium'
                  : 'text-ink-600 hover:bg-ink-50',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
          Price
        </p>
        <div className="space-y-1">
          {PRICES.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => onPrice(activePrice === p.value ? '' : p.value)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
                activePrice === p.value
                  ? 'bg-saffron-50 text-saffron-700 font-medium'
                  : 'text-ink-600 hover:bg-ink-50',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {onRating && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
            Rating
          </p>
          <div className="space-y-1">
            {RATINGS.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => onRating(activeRating === r.value ? '' : r.value)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
                  activeRating === r.value
                    ? 'bg-saffron-50 text-saffron-700 font-medium'
                    : 'text-ink-600 hover:bg-ink-50',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {onDuration && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
            Duration
          </p>
          <div className="space-y-1">
            {DURATIONS.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => onDuration(activeDuration === d.value ? '' : d.value)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
                  activeDuration === d.value
                    ? 'bg-saffron-50 text-saffron-700 font-medium'
                    : 'text-ink-600 hover:bg-ink-50',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        data-testid="filter-sidebar-desktop"
        className="hidden lg:block w-56 xl:w-64 flex-shrink-0"
      >
        <div className="card p-4 sticky top-6">
          {content}
        </div>
      </aside>

      {open && (
        <div
          data-testid="filter-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Course filters"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          <div
            data-testid="filter-drawer-backdrop"
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
          />
          <div className="relative z-10 w-72 max-w-[calc(100vw-2.5rem)] bg-white h-full shadow-xl overflow-y-auto overflow-x-hidden p-4 sm:p-5 animate-slide-up">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
