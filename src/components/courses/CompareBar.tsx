'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, AlertCircle, RefreshCw } from 'lucide-react';
import { useCompareStore } from '@/lib/hooks/use-compare-store';
import { cn } from '@/lib/utils';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAAC09K7GAAAAHklEQVQI12NgYGD4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==';

export interface CompareBarProps {
  isLoading?: boolean;
  error?: string | null;
  failedCourseIds?: string[];
  onRetry?: () => void;
  onRetryCourse?: (courseId: string) => void;
  showEmptyState?: boolean;
}

export function CompareBar({
  isLoading = false,
  error = null,
  failedCourseIds = [],
  onRetry,
  onRetryCourse,
  showEmptyState = false,
}: CompareBarProps = {}) {
  const router = useRouter();
  const courses = useCompareStore((state) => state.courses);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading comparison courses"
        data-testid="compare-bar-loading"
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-200 shadow-lg z-40"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="h-5 w-28 rounded bg-ink-100 animate-pulse" />
          <div className="flex gap-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="h-12 w-44 rounded-lg bg-ink-50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (courses.length === 0 && !error && !showEmptyState) return null;

  if (courses.length === 0 && showEmptyState && !error) {
    return (
      <div
        data-testid="compare-bar-empty"
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-200 shadow-lg z-40"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 text-center text-xs text-ink-500">
          Select up to 3 courses to compare side-by-side.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
        {(error || failedCourseIds.length > 0) && (
          <div
            role="alert"
            data-testid="compare-bar-error"
            className="flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span>
                {error ?? 'Failed to fetch details for one or more selected courses.'}
              </span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-1 font-semibold text-red-800 hover:bg-red-200 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 overflow-x-auto">
            <span className="text-sm font-semibold text-ink-900 whitespace-nowrap">
              Compare ({courses.length}/3)
            </span>
            <div className="flex gap-3">
              {courses.map((course) => {
                const isFailed = failedCourseIds.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className={cn(
                      'relative flex items-center gap-2 rounded-lg p-2 pr-8',
                      isFailed ? 'bg-red-50 border border-red-200' : 'bg-ink-50'
                    )}
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
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium">
                          Unavailable
                          {onRetryCourse && (
                            <button
                              type="button"
                              onClick={() => onRetryCourse(course.id)}
                              className="underline hover:text-red-800"
                            >
                              Retry
                            </button>
                          )}
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
              className="btn-primary px-6 py-2 text-sm whitespace-nowrap"
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
      </div>
    </div>
  );
}
