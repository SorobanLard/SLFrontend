import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  /** Called when the sentinel enters the viewport. Only fires when not already loading. */
  onLoadMore: () => void;
  /** Pass `true` while a fetch is in-flight to prevent duplicate requests. */
  loading: boolean;
  /** Pass `false` once the last page has been fetched to stop observing. */
  hasMore: boolean;
  /** Root margin – how far before the sentinel hits the viewport edge to trigger (default 200px). */
  rootMargin?: string;
  /**
   * Debounce delay in milliseconds. Rapid intersection events within this window
   * collapse into a single `onLoadMore` call (default 100 ms).
   */
  debounceMs?: number;
}

/**
 * useInfiniteScroll
 *
 * Returns a `sentinelRef` that you attach to a bottom-of-list element.
 * When that element comes within `rootMargin` of the viewport and
 * `loading` is false and `hasMore` is true, `onLoadMore` is called.
 *
 * ### Duplicate-fetch guard (fix for #179)
 *
 * `loading` is a React state value — it is only `true` after the parent
 * re-renders.  On a fast scroll the IntersectionObserver callback can fire
 * again before that re-render lands, so the stale `loading === false` check
 * passes a second (or third) time and kicks off overlapping requests.
 *
 * The fix uses two complementary mechanisms:
 *
 * 1. **`isFetchingRef`** – a `useRef` boolean that is set to `true`
 *    *synchronously* inside the callback, before React has a chance to
 *    re-render.  Every subsequent callback invocation sees the updated ref
 *    value and bails out immediately.  The ref is reset to `false` whenever
 *    `loading` transitions from `true` → `false` (i.e. the fetch settled).
 *
 * 2. **Debounce** – rapid intersection events (e.g. the element flickering in
 *    and out of the root margin during a momentum scroll) are collapsed into
 *    a single call using `setTimeout`.  The default window is 100 ms and is
 *    configurable via `debounceMs`.
 *
 * @example
 * const { sentinelRef } = useInfiniteScroll({ onLoadMore: fetchNext, loading, hasMore });
 * return (
 *   <>
 *     {courses.map(c => <CourseCard key={c.id} course={c} />)}
 *     <div ref={sentinelRef} />
 *   </>
 * );
 */
export function useInfiniteScroll({
  onLoadMore,
  loading,
  hasMore,
  rootMargin = '200px',
  debounceMs = 100,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Keep a stable reference to the latest callback so the observer closure
  // never becomes stale without needing to be re-created.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Synchronous in-flight guard — updated *before* any React re-render so
  // subsequent intersection callbacks within the same event-loop tick see the
  // correct value and do not dispatch a second request.
  const isFetchingRef = useRef(false);

  // Reset the guard once the parent signals that the fetch has settled
  // (loading flips back to false).
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      // loading just went true → false: fetch completed, allow next trigger.
      isFetchingRef.current = false;
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  // Stable debounced trigger so the observer callback ref stays the same
  // across re-renders.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLoadMore = useCallback(() => {
    // Clear any pending debounce so we don't stack timers.
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      // Double-check inside the timeout: another render may have updated state.
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      onLoadMoreRef.current();
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (isFetchingRef.current) return; // synchronous guard — fast path
        if (!hasMore) return;
        triggerLoadMore();
      },
      { rootMargin },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      // Cancel any pending debounce on cleanup to avoid calling onLoadMore
      // after the component has unmounted or the observer has been replaced.
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  // Re-create the observer when hasMore, rootMargin, or the debounced trigger
  // changes. `loading` is intentionally omitted — the isFetchingRef covers
  // that concern without forcing an observer teardown on every fetch cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, rootMargin, triggerLoadMore]);

  return { sentinelRef };
}
