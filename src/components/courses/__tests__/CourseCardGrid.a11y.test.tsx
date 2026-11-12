import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CourseCardGrid } from '../CourseCardGrid';
import type { Course } from '@/types';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/hooks/useHoverPrefetch', () => ({
  useHoverPrefetch: () => ({
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
  }),
}));

const MOCK_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Mastering Tailoring Fundamentals',
    description: 'Learn pattern drafting and garment construction.',
    category: 'Tailoring',
    level: 'BEGINNER',
    price: 25,
    thumbnailUrl: 'https://example.com/tailoring.jpg',
    instructorId: 'inst-1',
    instructor: {
      id: 'inst-1',
      name: 'Amina Bello',
      email: 'amina@example.com',
      role: 'INSTRUCTOR',
      createdAt: '2026-01-01T00:00:00Z',
    },
    totalDuration: 3600,
    rating: 4.8,
    reviewCount: 42,
    studentCount: 180,
    isPublished: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'course-2',
    title: 'Artisan Baking & Pastry',
    description: 'Bake sourdough and pastries from scratch.',
    category: 'Baking',
    level: 'INTERMEDIATE',
    price: 0,
    thumbnailUrl: null,
    instructorId: 'inst-2',
    totalDuration: 1800,
    isPublished: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('CourseCardGrid accessibility (#227)', () => {
  it('exposes accessible link names, image alt text, fallback thumbnail labels, wishlist button labels, and aria-hidden icons', () => {
    const { container } = render(<CourseCardGrid courses={MOCK_COURSES} />);

    const region = screen.getByRole('region', { name: /course catalog/i });
    expect(region).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('list', { name: /^courses$/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    const firstLink = screen.getByRole('link', {
      name: /view course: mastering tailoring fundamentals/i,
    });
    expect(firstLink).toHaveAttribute('href', '/dashboard/courses/course-1');

    const secondLink = screen.getByRole('link', {
      name: /view course: artisan baking & pastry/i,
    });
    expect(secondLink).toHaveAttribute('href', '/dashboard/courses/course-2');

    expect(
      screen.getByRole('img', { name: /mastering tailoring fundamentals course thumbnail/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('img', { name: /baking category thumbnail/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /add to wishlist: mastering tailoring fundamentals/i,
      }),
    ).toHaveAttribute('aria-pressed', 'false');

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('marks the catalog region busy and exposes a loading list label while skeletons render', () => {
    render(<CourseCardGrid courses={[]} loading skeletons={4} />);

    expect(screen.getByRole('region', { name: /course catalog/i })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('list', { name: /loading courses/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('supports keyboard-only Tab navigation across card links and wishlist buttons', async () => {
    const user = userEvent.setup();
    render(<CourseCardGrid courses={MOCK_COURSES} />);

    const firstLink = screen.getByRole('link', {
      name: /view course: mastering tailoring fundamentals/i,
    });
    const firstWishlistBtn = screen.getByRole('button', {
      name: /add to wishlist: mastering tailoring fundamentals/i,
    });
    const secondLink = screen.getByRole('link', {
      name: /view course: artisan baking & pastry/i,
    });

    await user.tab();
    expect(firstLink).toHaveFocus();

    await user.tab();
    expect(firstWishlistBtn).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', {
        name: /remove from wishlist: mastering tailoring fundamentals/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.tab();
    expect(secondLink).toHaveFocus();
  });
});
