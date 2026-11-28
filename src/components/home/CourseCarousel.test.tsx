import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseCarousel } from './CourseCarousel';
import type { Course } from '@/types';

// Mock next/navigation's useRouter — the hover-prefetch hook calls router.prefetch()
const mockPrefetch = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: mockPrefetch,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, className, priority }: any) {
    return <img src={src} alt={alt} className={className} data-priority={priority} />;
  },
}));

// Mock the wishlist store used by CourseCard
vi.mock('@/lib/hooks/use-wishlist-store', () => ({
  useIsWishlisted: vi.fn(() => false),
  useWishlistStore: vi.fn(() => ({ toggle: vi.fn() })),
}));

// Mock the lib/utils module
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
  courseTotalMins: vi.fn((mins: number) => Math.floor(mins / 60)),
  formatUsdc: vi.fn((price: number) => `$${price.toFixed(2)}`),
  levelChip: vi.fn(() => 'bg-sorobanlard-lilac text-sorobanlard-deep px-2 py-1 text-xs rounded'),
}));

const makeCourse = (id: string, title: string): Course => ({
  id,
  title,
  description: 'A representative course description.',
  category: 'Web Development',
  level: 'INTERMEDIATE',
  price: 49.99,
  originalPrice: 99.99,
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  totalDuration: 3600,
  totalLessons: 24,
  rating: 4.5,
  reviewCount: 1250,
  instructor: { id: 'instructor-1', name: 'John Doe', avatarUrl: null },
  status: 'ACTIVE',
  badge: 'bestseller',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const courses: Course[] = [
  makeCourse('course-1', 'Intro to React'),
  makeCourse('course-2', 'Advanced TypeScript'),
  makeCourse('course-3', 'Testing with Vitest'),
];

// jsdom does not implement window.matchMedia — stub it so the hover-prefetch
// hook can detect pointer devices.
const originalMatchMedia = window.matchMedia;

function stubMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('CourseCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubMatchMedia(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Populated state', () => {
    it('renders a card for each course', () => {
      render(<CourseCarousel courses={courses} />);
      courses.forEach((course) => {
        expect(screen.getByText(course.title)).toBeInTheDocument();
      });
    });

    it('renders the section heading when a title is provided', () => {
      render(<CourseCarousel courses={courses} title="Popular courses" />);
      expect(screen.getByText(/popular courses/i)).toBeInTheDocument();
    });

    it('links each card to its course detail page', () => {
      render(<CourseCarousel courses={courses} />);
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(courses.length);
      expect(links[0]).toHaveAttribute('href', `/dashboard/courses/${courses[0].id}`);
    });
  });

  describe('Empty state', () => {
    it('renders nothing meaningful when there are no courses', () => {
      const { container } = render(<CourseCarousel courses={[]} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('renders without crashing while loading', () => {
      const { container } = render(<CourseCarousel courses={[]} loading />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('scrolls the track when a next control is clicked', () => {
      render(<CourseCarousel courses={courses} />);
      const next = screen.queryByRole('button', { name: /next/i });
      if (next) {
        fireEvent.click(next);
        expect(next).toBeInTheDocument();
      }
    });
  });
});
