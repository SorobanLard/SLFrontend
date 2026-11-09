import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CourseCardGrid } from './CourseCardGrid';
import type { Course } from '@/types';

vi.mock('@/lib/hooks/use-wishlist-store', () => ({
  useIsWishlisted: vi.fn(() => false),
  useWishlistStore: vi.fn((selector) =>
    selector ? selector({ toggle: vi.fn() }) : { toggle: vi.fn() },
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, className, sizes }: any) {
    return <img src={src} alt={alt} className={className} sizes={sizes} />;
  },
}));

const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Professional Tailoring Fundamentals',
    description: 'Master pattern cutting and garment construction.',
    category: 'Tailoring',
    level: 'BEGINNER',
    price: 25,
    thumbnailUrl: 'https://example.com/tailoring.jpg',
    totalDuration: 1800,
    totalLessons: 12,
    rating: 4.8,
    reviewCount: 42,
    studentCount: 310,
    instructor: { id: 'inst-1', name: 'Amina Bello', avatarUrl: null },
    status: 'ACTIVE',
    previewVideoUrl: 'https://example.com/preview.mp4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'course-2',
    title: 'Artisan Baking & Pastry Mastery',
    description: 'Bake sourdough and pastries from scratch.',
    category: 'Baking',
    level: 'INTERMEDIATE',
    price: 35,
    thumbnailUrl: undefined,
    totalDuration: 2400,
    totalLessons: 16,
    rating: 4.6,
    reviewCount: 19,
    studentCount: 150,
    instructor: { id: 'inst-2', name: 'Chidi Okafor', avatarUrl: null },
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const originalMatchMedia = window.matchMedia;

describe('CourseCardGrid accessibility (Issue #227)', () => {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('exposes accessible names on every course card link in the grid', () => {
    render(<CourseCardGrid courses={mockCourses} />);

    const region = screen.getByRole('region', { name: 'Course catalog' });
    expect(region).toHaveAttribute('aria-busy', 'false');

    const list = screen.getByRole('list', { name: 'Courses' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    const link1 = screen.getByRole('link', { name: 'Professional Tailoring Fundamentals' });
    const link2 = screen.getByRole('link', { name: 'Artisan Baking & Pastry Mastery' });
    expect(link1).toHaveAttribute('href', '/dashboard/courses/course-1');
    expect(link2).toHaveAttribute('href', '/dashboard/courses/course-2');
  });

  it('provides text alternatives for both image thumbnails and emoji fallback placeholders', () => {
    render(<CourseCardGrid courses={mockCourses} />);

    expect(
      screen.getByRole('img', {
        name: 'Professional Tailoring Fundamentals course thumbnail',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('img', {
        name: 'Artisan Baking & Pastry Mastery course thumbnail',
      }),
    ).toBeInTheDocument();
  });

  it('provides course-specific accessible labels on wishlist buttons and hides decorative icons', () => {
    const { container } = render(<CourseCardGrid courses={mockCourses} />);

    expect(
      screen.getByRole('button', {
        name: 'Add to wishlist: Professional Tailoring Fundamentals',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Add to wishlist: Artisan Baking & Pastry Mastery',
      }),
    ).toBeInTheDocument();

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('announces busy state and loading skeletons when loading is true', () => {
    render(<CourseCardGrid courses={[]} loading skeletons={4} />);

    const region = screen.getByRole('region', { name: 'Course catalog' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('list', { name: 'Loading courses' })).toBeInTheDocument();
  });
});
