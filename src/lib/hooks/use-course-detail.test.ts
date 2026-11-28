// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCourseDetail } from './use-course-detail';

const mockFetch = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('useCourseDetail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in an idle state with no course loaded', () => {
    const { result } = renderHook(() => useCourseDetail());

    expect(result.current.course).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads a course and transitions to a loaded state', async () => {
    const course = { id: 'course-1', title: 'Intro to Soroban' };
    mockFetch.mockResolvedValueOnce(jsonResponse(course));

    const { result } = renderHook(() => useCourseDetail());

    await act(async () => {
      await result.current.fetchCourse('course-1');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.course).toEqual(course);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sets an error state when the request fails', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Not found' }, false, 404));

    const { result } = renderHook(() => useCourseDetail());

    await act(async () => {
      await result.current.fetchCourse('missing');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.course).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it('does not fetch when given an empty course id', async () => {
    const { result } = renderHook(() => useCourseDetail());

    await act(async () => {
      await result.current.fetchCourse('');
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.course).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resets back to the initial state', async () => {
    const course = { id: 'course-1', title: 'Intro to Soroban' };
    mockFetch.mockResolvedValueOnce(jsonResponse(course));

    const { result } = renderHook(() => useCourseDetail());

    await act(async () => {
      await result.current.fetchCourse('course-1');
    });

    await waitFor(() => expect(result.current.course).toEqual(course));

    act(() => {
      result.current.reset();
    });

    expect(result.current.course).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
