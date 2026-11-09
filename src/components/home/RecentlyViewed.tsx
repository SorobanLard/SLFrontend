'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Clock, RotateCcw } from 'lucide-react';
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

export function RecentlyViewed() {
  const isConnected = useAuthStore((state) => state.isConnected);
  const rehydrate = useAuthStore((state) => state.rehydrate);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const loadRecentlyViewed = useCallback(async () => {
    const entries = getRecentlyViewed();
    if (entries.length === 0) {
      setCourses([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const settled = await Promise.allSettled(
        entries.map(({ courseId }) => coursesApi.get(courseId)),
      );

      const loaded = settled
        .filter((res): res is PromiseFulfilledResult<Course> => res.status === 'fulfilled' && Boolean(res.value))
        .map((res) => res.value);

      const rejectedCount = settled.filter((res) => res.status === 'rejected').length;

      if (loaded.length === 0 && rejectedCount > 0) {
        setCourses([]);
        setError('Unable to load your recently viewed courses right now.');
      } else {
        setCourses(loaded);
        setError(null);
      }
    } catch {
      setCourses([]);
      setError('Unable to load your recently viewed courses right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentlyViewed();
  }, [isConnected, loadRecentlyViewed]);

  const handleClear = () => {
    clearRecentlyViewed();
    setCourses([]);
    setError(null);
    setConfirmingClear(false);
  };

  return (
    <section aria-labelledby="recently-viewed-heading">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="recently-viewed-heading" className="section-heading">Recently viewed</h2>
          <p className="mt-1 text-sm text-ink-400">Pick up where you left off</p>
        </div>
        {courses.length > 0 && (
          confirmingClear ? (
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
          )
        )}
      </div>

      {loading ? (
        <div
          data-testid="recently-viewed-loading"
          role="status"
          aria-live="polite"
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <span className="sr-only">Loading recently viewed courses…</span>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-48 rounded-xl border border-ink-100 bg-ink-50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div
          data-testid="recently-viewed-error"
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50/40 p-8 text-center space-y-3"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-ink-900">
            Could not load recently viewed courses
          </p>
          <p className="text-xs text-ink-500 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => void loadRecentlyViewed()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sorobanlard-primary px-4 py-2 text-xs font-semibold text-white hover:bg-sorobanlard-mid transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div
          data-testid="recently-viewed-empty"
          className="rounded-2xl border border-ink-100 bg-white p-8 text-center space-y-2"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink-50 text-ink-400">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-ink-900">
            No recently viewed courses yet
          </p>
          <p className="text-xs text-ink-500 max-w-md mx-auto">
            Courses you explore will appear here so you can easily pick up where you left off.
          </p>
          <div className="pt-2">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sorobanlard-primary hover:underline"
            >
              Browse courses
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div
          data-testid="recently-viewed-list"
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 no-scrollbar"
        >
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
      )}
    </section>
  );
}
