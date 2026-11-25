// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEnrollments } from './use-enrollments';

describe('useEnrollments', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty enrollment list', () => {
    const { result } = renderHook(() => useEnrollments());

    expect(result.current.enrollments).toEqual([]);
  });

  it('adds an enrollment when enroll is called', () => {
    const { result } = renderHook(() => useEnrollments());

    act(() => {
      result.current.enroll('course-1');
    });

    expect(result.current.enrollments).toContain('course-1');
  });

  it('does not add duplicate enrollments', () => {
    const { result } = renderHook(() => useEnrollments());

    act(() => {
      result.current.enroll('course-1');
      result.current.enroll('course-1');
    });

    expect(result.current.enrollments.filter((id) => id === 'course-1')).toHaveLength(1);
  });

  it('removes an enrollment when unenroll is called', () => {
    const { result } = renderHook(() => useEnrollments());

    act(() => {
      result.current.enroll('course-1');
    });
    act(() => {
      result.current.unenroll('course-1');
    });

    expect(result.current.enrollments).not.toContain('course-1');
  });

  it('reports whether a course is enrolled', () => {
    const { result } = renderHook(() => useEnrollments());

    expect(result.current.isEnrolled('course-1')).toBe(false);

    act(() => {
      result.current.enroll('course-1');
    });

    expect(result.current.isEnrolled('course-1')).toBe(true);
  });

  it('ignores empty input when enrolling', () => {
    const { result } = renderHook(() => useEnrollments());

    act(() => {
      result.current.enroll('');
    });

    expect(result.current.enrollments).toEqual([]);
  });

  it('resets enrollments when reset is called', () => {
    const { result } = renderHook(() => useEnrollments());

    act(() => {
      result.current.enroll('course-1');
      result.current.enroll('course-2');
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.enrollments).toEqual([]);
  });
});
