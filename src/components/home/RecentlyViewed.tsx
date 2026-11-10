'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, AlertCircle, BookOpen, RefreshCw } from 'lucide-react';
import { CourseCard } from '@/components/courses/CourseCard';
import { coursesApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { clearRecentlyViewed, getRecentlyViewed, recordRecentlyViewed } from '@/lib/recently-viewed';
import type { Course } from '@/types';

export function RecentlyViewedTracker({ courseId }: { courseId: string }) {
  useEffect(() => {
    recordRecentlyViewed(courseId);
  }, [courseId]);
  return null;
}

export interface RecentlyViewedProps {
  showEmptyState?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function RecentlyViewed({
  showEmptyState = false,
  isLoading: isLoadingProp,
  error: errorProp,
  onRetry,
}: RecentlyViewedProps = {}) {
  const isConnected = useAuthStore((state) => state.isConnected);
  const rehydrate = useAuthStore((state) => state.rehydrate);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const loadCourses = useCallback(() => {
    if (!isConnected) {
      setCourses([]);
      setLoading(false);
      setFetchError(null);
      return () => {};
    }

    const entries = getRecentlyViewed();
    if (entries.length === 0) {
      setCourses([]);
      setLoading(false);
      setFetchError(null);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    let failedCount = 0;
    Promise.all(
      entries.map(({ courseId }) =>
        coursesApi.get(courseId).catch(() => {
          failedCount += 1;
          return null;
        }),
      ),
    ).then((results) => {
      if (cancelled) return;
      const valid = results.filter((course): course is Course => course !== null);
      setCourses(valid);
      if (valid.length === 0 && failedCount > 0) {
        setFetchError('Unable to load your recently viewed courses.');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  useEffect(() => {
    return loadCourses();
  }, [loadCourses, retryTick]);

  const handleClear = () => {
    clearRecentlyViewed();
    setCourses([]);
    setFetchError(null);
    setConfirmingClear(false);
  };

  const activeLoading = isLoadingProp ?? loading;
  const activeError = errorProp ?? fetchError;

  if (activeLoading) {
    return (
      <section
        role="status"
        aria-label="Loading recently viewed courses"
        data-testid="recently-viewed-loading"
        className="space-y-4"
      >
        <div className="h-7 w-48 rounded-lg bg-ink-100 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-48 w-64 shrink-0 rounded-xl bg-ink-50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (activeError) {
    return (
      <section
        role="alert"
        data-testid="recently-viewed-error"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3"
      >
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <div>
          <p className="text-sm font-semibold text-red-900">Recently viewed unavailable</p>
          <p className="text-xs text-red-700 mt-1">{activeError}</p>
        </div>
        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : setRetryTick((t) => t + 1))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </section>
    );
  }

  if (!isConnected || courses.length === 0) {
    if (!showEmptyState) return null;
    return (
      <section
        data-testid="recently-viewed-empty"
        aria-labelledby="recently-viewed-heading"
        className="rounded-2xl border border-ink-100 bg-white p-8 text-center space-y-3"
      >
        <BookOpen className="h-8 w-8 text-ink-300 mx-auto" />
        <div>
          <h2 id="recently-viewed-heading" className="text-sm font-semibold text-ink-800">
            No recently viewed courses yet
          </h2>
          <p className="text-xs text-ink-400 mt-1">
            Courses you explore will appear here so you can easily pick up where you left off.
          </p>
        </div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sorobanlard-primary hover:underline"
        >
          Browse courses <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="recently-viewed-heading">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="recently-viewed-heading" className="section-heading">Recently viewed</h2>
          <p className="mt-1 text-sm text-ink-400">Pick up where you left off</p>
        </div>
        {confirmingClear ? (
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="text-ink-400">Clear history?</span>
            <button
              type="button"
              onClick={handleClear}
              className="font-semibold text-sorobanlard-primary transition-colors hover:underline"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="font-semibold text-ink-400 transition-colors hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="shrink-0 text-sm font-semibold text-ink-400 transition-colors hover:text-sorobanlard-primary"
          >
            Clear
          </button>
        )}
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
        {courses.map((course) => (
          <div key={course.id} className="w-[72vw] max-w-[280px] shrink-0 snap-start sm:w-[264px]">
            <CourseCard course={course} href={`/courses/${course.id}`} />
          </div>
        ))}
        <Link
          href="/courses"
          className="flex min-h-48 w-44 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border border-ink-100 bg-white text-sm font-semibold text-sorobanlard-primary transition-colors hover:bg-sorobanlard-lilac"
        >
          See all courses
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
