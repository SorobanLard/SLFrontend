// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecentlyViewed } from './RecentlyViewed';
import { coursesApi } from '@/lib/api/services';
import { recordRecentlyViewed } from '@/lib/recently-viewed';
import type { Course } from '@/types';

vi.mock('@/lib/api/services', () => ({
  coursesApi: {
    get: vi.fn(),
  },
  usersApi: {
    deleteAccount: vi.fn(),
  },
}));

vi.mock('@/components/courses/CourseCard', () => ({
  CourseCard: ({ course }: { course: Course }) => (
    <div data-testid="mock-course-card">{course.title}</div>
  ),
}));

const sampleCourse: Course = {
  id: 'course-101',
  title: 'Intro to Stellar & Soroban',
  description: 'Learn smart contracts',
  category: 'Web Development',
  level: 'Beginner',
  price: 0,
  status: 'PUBLISHED',
  instructorId: 'inst-1',
  createdAt: '2026-02-01T00:00:00Z',
};

describe('RecentlyViewed states (#200)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders empty state for first-time visitors with no viewing history', async () => {
    render(<RecentlyViewed />);

    expect(await screen.findByTestId('recently-viewed-empty')).toBeInTheDocument();
    expect(
      screen.getByText(/no recently viewed courses yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse courses/i })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it('renders loading state while recently viewed courses are being fetched', () => {
    recordRecentlyViewed('course-101');
    vi.mocked(coursesApi.get).mockReturnValue(new Promise(() => {}));

    render(<RecentlyViewed />);

    expect(screen.getByTestId('recently-viewed-loading')).toBeInTheDocument();
  });

  it('renders error state with retry action when course fetch fails', async () => {
    recordRecentlyViewed('course-101');
    vi.mocked(coursesApi.get)
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce(sampleCourse);

    render(<RecentlyViewed />);

    expect(await screen.findByTestId('recently-viewed-error')).toBeInTheDocument();
    expect(
      screen.getByText(/could not load recently viewed courses/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByTestId('recently-viewed-list')).toBeInTheDocument();
      expect(screen.getByText('Intro to Stellar & Soroban')).toBeInTheDocument();
    });
  });

  it('renders populated recently viewed courses when history exists', async () => {
    recordRecentlyViewed('course-101');
    vi.mocked(coursesApi.get).mockResolvedValueOnce(sampleCourse);

    render(<RecentlyViewed />);

    expect(await screen.findByTestId('recently-viewed-list')).toBeInTheDocument();
    expect(screen.getByText('Intro to Stellar & Soroban')).toBeInTheDocument();
  });
});
