import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearnSidebar } from './LearnSidebar';

// Mock next/link so anchors render as plain <a> elements in jsdom
vi.mock('next/link', () => ({
  default: function MockLink({ href, children, ...rest }: any) {
    return (
      <a href={typeof href === 'string' ? href : String(href)} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock the lib/utils module used for class merging
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockLessons = [
  { id: 'lesson-1', title: 'Introduction to React', completed: true },
  { id: 'lesson-2', title: 'Hooks Deep Dive', completed: false },
  { id: 'lesson-3', title: 'Advanced Patterns', completed: false },
];

describe('LearnSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Populated state', () => {
    it('renders the sidebar heading', () => {
      render(<LearnSidebar lessons={mockLessons} />);
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('renders every lesson title', () => {
      render(<LearnSidebar lessons={mockLessons} />);
      mockLessons.forEach((lesson) => {
        expect(screen.getByText(lesson.title)).toBeInTheDocument();
      });
    });

    it('renders a link for each lesson', () => {
      render(<LearnSidebar lessons={mockLessons} />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(mockLessons.length);
    });

    it('marks completed lessons with a completed indicator', () => {
      render(<LearnSidebar lessons={mockLessons} />);
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
    });
  });

  describe('Empty state', () => {
    it('renders an empty message when there are no lessons', () => {
      render(<LearnSidebar lessons={[]} />);
      expect(screen.getByText(/no lessons/i)).toBeInTheDocument();
    });

    it('does not render lesson links when empty', () => {
      render(<LearnSidebar lessons={[]} />);
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
  });

  describe('Loading state', () => {
    it('renders a loading indicator when loading is true', () => {
      render(<LearnSidebar lessons={[]} loading />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('does not render the empty message while loading', () => {
      render(<LearnSidebar lessons={[]} loading />);
      expect(screen.queryByText(/no lessons/i)).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onLessonSelect when a lesson is clicked', () => {
      const onLessonSelect = vi.fn();
      render(<LearnSidebar lessons={mockLessons} onLessonSelect={onLessonSelect} />);
      fireEvent.click(screen.getByText('Hooks Deep Dive'));
      expect(onLessonSelect).toHaveBeenCalledWith('lesson-2');
    });

    it('filters lessons when typing in the search input', () => {
      render(<LearnSidebar lessons={mockLessons} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Hooks' } });
      expect(screen.getByText('Hooks Deep Dive')).toBeInTheDocument();
      expect(screen.queryByText('Introduction to React')).not.toBeInTheDocument();
    });
  });
});
