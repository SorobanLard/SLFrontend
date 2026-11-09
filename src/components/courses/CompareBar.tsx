'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, Loader2, RotateCcw, X } from 'lucide-react';
import { useCompareStore } from '@/lib/hooks/use-compare-store';
import type { Course } from '@/types';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAHklEQVQI12NgYGD4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==';

export interface CompareBarProps {
  /** True while compared courses are fetching detail data */
  isLoading?: boolean;
  /** Error message when one or more compared courses fail to load detail data */
  error?: string | null;
  /** IDs of courses whose detail fetch failed */
  failedCourseIds?: string[];
  /** Callback to retry failed course detail fetches */
  onRetry?: () => void;
  /** Optional async fetcher to validate/load full course details for compared items */
  fetchCourseDetail?: (courseId: string) => Promise<Course>;
  /** When true, renders an explicit empty-state banner when no courses are selected */
  showEmptyState?: boolean;
}

export function CompareBar({
  isLoading = false,
  error = null,
  failedCourseIds = [],
  onRetry,
  fetchCourseDetail,
  showEmptyState = false,
}: CompareBarProps = {}) {
  const router = useRouter();
  const courses = useCompareStore((state) => state.courses);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  const [internalLoading, setInternalLoading] = useState(false);
  const [internalFailedIds, setInternalFailedIds] = useState<string[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);

  const loadCourseDetails = useCallback(async () => {
    if (!fetchCourseDetail || courses.length === 0) {
      setInternalFailedIds([]);
      setInternalError(null);
      return;
    }

    setInternalLoading(true);
    setInternalError(null);
    const failed: string[] = [];

    await Promise.all(
      courses.map(async (course) => {
        try {
          await fetchCourseDetail(course.id);
        } catch {
          failed.push(course.id);
        }
      }),
    );

    setInternalFailedIds(failed);
    if (failed.length > 0) {
      setInternalError(
        failed.length === 1
          ? '1 compared course failed to load detail data.'
          : `${failed.length} compared courses failed to load detail data.`,
      );
    }
    setInternalLoading(false);
  }, [courses, fetchCourseDetail]);

  useEffect(() => {
    void loadCourseDetails();
  }, [loadCourseDetails]);

  const effectiveLoading = isLoading || internalLoading;
  const effectiveFailedIds = failedCourseIds.length > 0 ? failedCourseIds : internalFailedIds;
  const effectiveError =
    error ??
    internalError ??
    (effectiveFailedIds.length > 0
      ? 'Some compared courses failed to load detail data.'
      : null);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (fetchCourseDetail) {
      void loadCourseDetails();
    }
  };

  if (courses.length === 0 && !effectiveLoading && !effectiveError) {
    if (!showEmptyState) return null;

    return (
      <div
        data-testid="compare-bar-empty"
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-200 shadow-lg z-40"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 text-center">
          <p className="text-xs font-medium text-ink-600">
            No courses selected for comparison. Select up to 3 courses to compare side by side.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
        {effectiveLoading && (
          <div
            data-testid="compare-bar-loading"
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-xs font-medium text-ink-600"
          >
            <Loader2 className="h-4 w-4 animate-spin text-sorobanlard-primary" aria-hidden="true" />
            <span>Loading compared course details…</span>
          </div>
        )}

        {!effectiveLoading && effectiveError && (
          <div
            data-testid="compare-bar-error"
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{effectiveError}</span>
            </div>
            {(onRetry || fetchCourseDetail) && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        )}

        {courses.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 overflow-x-auto">
              <span className="text-sm font-semibold text-ink-900 whitespace-nowrap">
                Compare ({courses.length}/3)
              </span>
              <div className="flex gap-3">
                {courses.map((course) => {
                  const hasFailed = effectiveFailedIds.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      className={`relative flex items-center gap-2 rounded-lg p-2 pr-8 ${
                        hasFailed
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-ink-50'
                      }`}
                    >
                      <div className="relative w-16 h-10 rounded overflow-hidden flex-shrink-0">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-saffron-100 to-saffron-200">
                            <span className="text-lg">
                              {course.category === 'Tailoring' ? '🧵' :
                               course.category === 'Baking' ? '🍰' :
                               course.category === 'Photography' ? '📷' :
                               course.category === 'Makeup Artistry' ? '💄' :
                               course.category === 'Hairstyling' ? '💇' :
                               course.category === 'Nail Technology' ? '💅' : '🎓'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs text-ink-700 max-w-[120px] truncate">
                          {course.title}
                        </span>
                        {hasFailed && (
                          <span className="block text-[10px] font-medium text-red-600">
                            Failed to load details
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => remove(course.id)}
                        aria-label={`Remove ${course.title} from comparison`}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-ink-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-ink-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/compare')}
                disabled={effectiveLoading}
                className="btn-primary px-6 py-2 text-sm whitespace-nowrap disabled:opacity-50"
              >
                Compare Now
              </button>
              <button
                onClick={clear}
                className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
