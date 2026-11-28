import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContinueLearningBanner } from './ContinueLearningBanner';

// Mock next/link so anchors render as plain <a> elements in jsdom
vi.mock('next/link', () => ({
  default: function MockLink({ href, children, ...rest }: any) {
    return (
      <a href={typeof href === 'string' ? href : href?.pathname} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, className }: any) {
    return <img src={src} alt={alt} className={className} />;
  },
}));

// Mock the lib/utils module
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockCourse = {
  id: 'course-123',
  title: 'Advanced React Patterns',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  totalLessons: 24,
  completedLessons: 6,
};

describe('ContinueLearningBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('renders nothing when no course is provided', () => {
      const { container } = render(<ContinueLearningBanner course={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when course is undefined', () => {
      const { container } = render(<ContinueLearningBanner course={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Loading state', () => {
    it('renders a loading placeholder when loading is true', () => {
      render(<ContinueLearningBanner course={mockCourse} loading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render the course title while loading', () => {
      render(<ContinueLearningBanner course={mockCourse} loading={true} />);
      expect(screen.queryByText(mockCourse.title)).not.toBeInTheDocument();
    });
  });

  describe('Populated state', () => {
    it('renders the course title', () => {
      render(<ContinueLearningBanner course={mockCourse} />);
      expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    });

    it('renders the thumbnail image', () => {
      render(<ContinueLearningBanner course={mockCourse} />);
      const image = screen.getByAltText(`${mockCourse.title} thumbnail`);
      expect(image).toHaveAttribute('src', mockCourse.thumbnailUrl);
    });

    it('renders a continue link pointing at the course', () => {
      render(<ContinueLearningBanner course={mockCourse} />);
      const link = screen.getByRole('link', { name: /continue/i });
      expect(link).toHaveAttribute('href', `/dashboard/courses/${mockCourse.id}`);
    });

    it('shows progress based on completed lessons', () => {
      render(<ContinueLearningBanner course={mockCourse} />);
      expect(screen.getByText(/6\s*\/\s*24/i)).toBeInTheDocument();
    });

    it('invokes onContinue when the continue button is clicked', () => {
      const onContinue = vi.fn();
      render(<ContinueLearningBanner course={mockCourse} onContinue={onContinue} />);
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });
});
