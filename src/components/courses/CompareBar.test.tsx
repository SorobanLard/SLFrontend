// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareBar } from './CompareBar';
import { useCompareStore } from '@/lib/hooks/use-compare-store';
import type { Course } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const sampleCourse: Course = {
  id: 'course-1',
  title: 'Soroban Smart Contracts',
  description: 'Build on Stellar',
  category: 'Web Development',
  level: 'Intermediate',
  price: 40,
  status: 'PUBLISHED',
  instructorId: 'inst-1',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('CompareBar states (#202)', () => {
  beforeEach(() => {
    useCompareStore.setState({ courses: [] });
  });

  it('renders empty state when showEmptyState is enabled and no courses are selected', () => {
    render(<CompareBar showEmptyState />);

    expect(screen.getByTestId('compare-bar-empty')).toBeInTheDocument();
    expect(
      screen.getByText(/no courses selected for comparison/i),
    ).toBeInTheDocument();
  });

  it('renders loading state when course details are being fetched', () => {
    useCompareStore.setState({ courses: [sampleCourse] });
    render(<CompareBar isLoading />);

    expect(screen.getByTestId('compare-bar-loading')).toBeInTheDocument();
    expect(
      screen.getByText(/loading compared course details/i),
    ).toBeInTheDocument();
  });

  it('renders error state with retry action when a compared course fails to load detail data', async () => {
    useCompareStore.setState({ courses: [sampleCourse] });
    const fetchCourseDetail = vi
      .fn<(courseId: string) => Promise<Course>>()
      .mockRejectedValueOnce(new Error('Failed to load course detail'))
      .mockResolvedValueOnce(sampleCourse);

    render(<CompareBar fetchCourseDetail={fetchCourseDetail} />);

    const errorAlert = await screen.findByTestId('compare-bar-error');
    expect(errorAlert).toHaveTextContent(/1 compared course failed to load detail data/i);
    expect(screen.getByText(/failed to load details/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(fetchCourseDetail).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('compare-bar-error')).toBeNull();
    });
  });

  it('renders populated comparison bar when courses are loaded', () => {
    useCompareStore.setState({ courses: [sampleCourse] });
    render(<CompareBar />);

    expect(screen.getByText('Compare (1/3)')).toBeInTheDocument();
    expect(screen.getByText('Soroban Smart Contracts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compare now/i })).toBeInTheDocument();
  });
});
