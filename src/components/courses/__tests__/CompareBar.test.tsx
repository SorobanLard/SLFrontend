// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareBar } from '../CompareBar';
import { useCompareStore } from '@/lib/hooks/use-compare-store';
import type { Course } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const sampleCourse: Course = {
  id: 'course-1',
  courseId: 'TAILOR-01',
  title: 'Tailoring Mastery',
  description: 'Learn tailoring',
  category: 'Tailoring',
  level: 'Beginner',
  language: 'English',
  price: 25,
  rating: 4.8,
  enrollmentCount: 40,
  status: 'PUBLISHED',
  instructorId: 'inst-1',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('CompareBar loading, error, and empty states (#202)', () => {
  beforeEach(() => {
    useCompareStore.setState({ courses: [] });
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<CompareBar isLoading />);
    expect(screen.getByTestId('compare-bar-loading')).toBeInTheDocument();
  });

  it('renders error alert and retry callback when course fetch fails', () => {
    const onRetry = vi.fn();
    const onRetryCourse = vi.fn();
    useCompareStore.setState({ courses: [sampleCourse] });

    render(
      <CompareBar
        error="Failed to load comparison details"
        failedCourseIds={['course-1']}
        onRetry={onRetry}
        onRetryCourse={onRetryCourse}
      />
    );

    expect(screen.getByTestId('compare-bar-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load comparison details')).toBeInTheDocument();

    const retryButtons = screen.getAllByRole('button', { name: /Retry/i });
    fireEvent.click(retryButtons[0]);
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(retryButtons[1]);
    expect(onRetryCourse).toHaveBeenCalledWith('course-1');
  });

  it('renders explicit empty state when showEmptyState is true and no courses are selected', () => {
    render(<CompareBar showEmptyState />);
    expect(screen.getByTestId('compare-bar-empty')).toBeInTheDocument();
  });
});
