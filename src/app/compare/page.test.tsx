import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompareStore } from '@/lib/hooks/use-compare-store';
import type { Course } from '@/types';
import ComparePage from './page';

const mockPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const makeCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'course-1',
  instructorAddress: 'instructor-1',
  title: 'Soroban Basics',
  description: 'Learn smart contracts',
  category: 'Tailoring',
  level: 'Beginner',
  language: 'English',
  thumbnailUrl: null,
  previewVideoUrl: null,
  price: 19.99,
  platformFeePercent: 10,
  status: 'ACTIVE',
  totalLessons: 10,
  totalDuration: 3600,
  totalEnrollments: 20,
  totalRevenue: 399.8,
  txHash: null,
  approvedAt: '2024-01-01T00:00:00Z',
  createdAt: '2023-12-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  instructor: { name: 'Jane Doe', stellarAddress: 'instructor-1', avatarUrl: null },
  modules: [],
  _count: { enrollments: 20 },
  rating: 4.5,
  reviewCount: 8,
  ...overrides,
});

describe('Compare page', () => {
  beforeEach(() => {
    localStorage.clear();
    useCompareStore.setState({ courses: [] });
    vi.clearAllMocks();
  });

  it('renders course details, comparison criteria, and browse/view CTAs', () => {
    useCompareStore.setState({
      courses: [
        makeCourse(),
        makeCourse({ id: 'course-2', title: 'Stellar Payments', level: 'Intermediate' }),
      ],
    });

    render(<ComparePage />);

    expect(screen.getByRole('heading', { name: 'Compare Courses' })).toBeInTheDocument();
    expect(screen.getByText('Compare up to 3 courses side by side')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute(
      'href',
      '/courses',
    );

    const table = screen.getByRole('table');
    expect(within(table).getByText('Soroban Basics')).toBeInTheDocument();
    expect(within(table).getByText('Stellar Payments')).toBeInTheDocument();
    expect(within(table).getByText('Rating')).toBeInTheDocument();
    expect(within(table).getByText('Duration')).toBeInTheDocument();
    expect(within(table).getByText('Lectures')).toBeInTheDocument();
    expect(within(table).getByText('Certificate')).toBeInTheDocument();
    expect(within(table).getAllByRole('link', { name: 'View Course' })).toHaveLength(2);
  });

  it('redirects to course browsing when there are no courses to compare', async () => {
    const { container } = render(<ComparePage />);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/courses'));
  });

  it('clears the comparison and redirects when Clear All is clicked', async () => {
    useCompareStore.setState({ courses: [makeCourse()] });

    render(<ComparePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/courses'));
    expect(useCompareStore.getState().courses).toEqual([]);
  });
});
