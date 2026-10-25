import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from './useInfiniteScroll';

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------
// jsdom does not implement IntersectionObserver.  We replace it with a
// controllable fake so tests can trigger intersection events directly.

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallback: IOCallback | null = null;
let observedElement: Element | null = null;

const mockObserve = vi.fn((el: Element) => {
  observedElement = el;
});
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(callback: IOCallback, _options?: IntersectionObserverInit) {
    observerCallback = callback;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
}

beforeEach(() => {
  vi.useFakeTimers();
  observerCallback = null;
  observedElement = null;
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helper: simulate the sentinel entering the viewport
// ---------------------------------------------------------------------------
function triggerIntersection(isIntersecting: boolean) {
  act(() => {
    observerCallback?.([
      { isIntersecting } as IntersectionObserverEntry,
    ]);
  });
}

// ---------------------------------------------------------------------------
// Test component
// ---------------------------------------------------------------------------
function Sentinel({
  onLoadMore,
  loading,
  hasMore,
  debounceMs = 0,
}: {
  onLoadMore: () => void;
  loading: boolean;
  hasMore: boolean;
  debounceMs?: number;
}) {
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore,
    loading,
    hasMore,
    debounceMs,
  });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useInfiniteScroll', () => {
  describe('basic behaviour', () => {
    it('calls onLoadMore when the sentinel intersects and hasMore is true', () => {
      const onLoadMore = vi.fn();
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={0} />);

      triggerIntersection(true);
      act(() => vi.runAllTimers());

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onLoadMore when hasMore is false', () => {
      const onLoadMore = vi.fn();
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={false} debounceMs={0} />);

      triggerIntersection(true);
      act(() => vi.runAllTimers());

      expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('does NOT call onLoadMore when the sentinel is not intersecting', () => {
      const onLoadMore = vi.fn();
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={0} />);

      triggerIntersection(false);
      act(() => vi.runAllTimers());

      expect(onLoadMore).not.toHaveBeenCalled();
    });

    it('attaches an observer to the sentinel element', () => {
      const onLoadMore = vi.fn();
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} />);
      expect(mockObserve).toHaveBeenCalledTimes(1);
      expect(observedElement).not.toBeNull();
    });

    it('disconnects the observer on unmount', () => {
      const onLoadMore = vi.fn();
      const { unmount } = render(
        <Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} />,
      );
      unmount();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Core fix: duplicate-fetch prevention
  // -------------------------------------------------------------------------
  describe('duplicate fetch prevention (fix for #179)', () => {
    it('does NOT call onLoadMore a second time if the sentinel fires again before loading resets', () => {
      const onLoadMore = vi.fn();
      // Render with loading=false so the first fire goes through.
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={0} />);

      // First intersection — should trigger.
      triggerIntersection(true);
      act(() => vi.runAllTimers());
      expect(onLoadMore).toHaveBeenCalledTimes(1);

      // Simulate a fast second intersection before the parent re-renders with
      // loading=true.  isFetchingRef must block this.
      triggerIntersection(true);
      act(() => vi.runAllTimers());
      expect(onLoadMore).toHaveBeenCalledTimes(1); // still only 1
    });

    it('allows a new fetch once loading transitions back to false', () => {
      const onLoadMore = vi.fn();
      const { rerender } = render(
        <Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={0} />,
      );

      // First fetch.
      triggerIntersection(true);
      act(() => vi.runAllTimers());
      expect(onLoadMore).toHaveBeenCalledTimes(1);

      // Simulate the parent setting loading=true then back to false.
      rerender(<Sentinel onLoadMore={onLoadMore} loading={true} hasMore={true} debounceMs={0} />);
      rerender(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={0} />);

      // A new intersection should now trigger again.
      triggerIntersection(true);
      act(() => vi.runAllTimers());
      expect(onLoadMore).toHaveBeenCalledTimes(2);
    });

    it('blocks multiple rapid intersections collapsing into more than one fetch', () => {
      const onLoadMore = vi.fn();
      // Use a non-zero debounce to also exercise the debounce path.
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={50} />);

      // Fire the sentinel 5 times in quick succession (simulating fast scroll).
      for (let i = 0; i < 5; i++) {
        triggerIntersection(true);
      }
      act(() => vi.runAllTimers());

      // Only one fetch should have been triggered.
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Debounce behaviour
  // -------------------------------------------------------------------------
  describe('debounce', () => {
    it('delays the onLoadMore call by debounceMs', () => {
      const onLoadMore = vi.fn();
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={100} />);

      triggerIntersection(true);

      // Not yet — debounce has not elapsed.
      act(() => vi.advanceTimersByTime(99));
      expect(onLoadMore).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('collapses multiple rapid intersections within the debounce window into one call', () => {
      const onLoadMore = vi.fn();
      render(<Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={100} />);

      // Three intersections within 100 ms.
      triggerIntersection(true);
      act(() => vi.advanceTimersByTime(30));
      triggerIntersection(true);
      act(() => vi.advanceTimersByTime(30));
      triggerIntersection(true);

      // None should have fired yet.
      expect(onLoadMore).not.toHaveBeenCalled();

      // Advance past the debounce window from the last intersection.
      act(() => vi.advanceTimersByTime(100));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('cancels any pending debounce timer on unmount', () => {
      const onLoadMore = vi.fn();
      const { unmount } = render(
        <Sentinel onLoadMore={onLoadMore} loading={false} hasMore={true} debounceMs={200} />,
      );

      triggerIntersection(true);
      // Unmount before the debounce fires.
      unmount();
      act(() => vi.runAllTimers());

      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Callback stability
  // -------------------------------------------------------------------------
  describe('onLoadMore ref stays current', () => {
    it('calls the latest onLoadMore even when it changes between renders', () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      const { rerender } = render(
        <Sentinel onLoadMore={firstCallback} loading={false} hasMore={true} debounceMs={0} />,
      );

      // Swap to a new callback without triggering an intersection yet.
      rerender(<Sentinel onLoadMore={secondCallback} loading={false} hasMore={true} debounceMs={0} />);

      triggerIntersection(true);
      act(() => vi.runAllTimers());

      // The latest callback should be invoked — the first should not.
      expect(secondCallback).toHaveBeenCalledTimes(1);
      expect(firstCallback).not.toHaveBeenCalled();
    });
  });
});
