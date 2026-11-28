// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCourses } from './use-courses';

describe('useCourses', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with an empty course list and no error', () => {
    const { result } = renderHook(() => useCourses());

    expect(result.current.courses).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('adds a course when addCourse is called', () => {
    const { result } = renderHook(() => useCourses());

    act(() => {
      result.current.addCourse({
        id: 'course-1',
        title: 'Intro to Soroban',
        description: 'Learn the basics',
        price: 100,
      });
    });

    expect(result.current.courses).toHaveLength(1);
    expect(result.current.courses[0].id).toBe('course-1');
    expect(result.current.error).toBeNull();
  });

  it('removes a course when removeCourse is called', () => {
    const { result } = renderHook(() => useCourses());

    act(() => {
      result.current.addCourse({
        id: 'course-1',
        title: 'Intro to Soroban',
        description: 'Learn the basics',
        price: 100,
      });
    });

    act(() => {
      result.current.removeCourse('course-1');
    });

    expect(result.current.courses).toEqual([]);
  });

  it('resets state back to the initial value', () => {
    const { result } = renderHook(() => useCourses());

    act(() => {
      result.current.addCourse({
        id: 'course-1',
        title: 'Intro to Soroban',
        description: 'Learn the basics',
        price: 100,
      });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.courses).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('ignores empty input without throwing', () => {
    const { result } = renderHook(() => useCourses());

    act(() => {
      result.current.addCourse({
        id: '',
        title: '',
        description: '',
        price: 0,
      });
    });

    expect(result.current.courses).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });
});
