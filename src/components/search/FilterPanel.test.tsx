import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterPanel } from './FilterPanel';

// Mock the lib/utils module to keep class-name assertions stable
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const defaultProps = {
  categories: ['Web Development', 'Design', 'Marketing'],
  levels: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  selectedCategory: null as string | null,
  selectedLevel: null as string | null,
  onCategoryChange: vi.fn(),
  onLevelChange: vi.fn(),
};

describe('FilterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the panel heading', () => {
      render(<FilterPanel {...defaultProps} />);
      expect(screen.getByText(/filters/i)).toBeInTheDocument();
    });

    it('renders all provided categories', () => {
      render(<FilterPanel {...defaultProps} />);
      defaultProps.categories.forEach((category) => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });

    it('renders all provided levels', () => {
      render(<FilterPanel {...defaultProps} />);
      defaultProps.levels.forEach((level) => {
        expect(screen.getByText(new RegExp(level, 'i'))).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('renders without crashing when no categories or levels are provided', () => {
      render(
        <FilterPanel
          {...defaultProps}
          categories={[]}
          levels={[]}
        />,
      );
      expect(screen.getByText(/filters/i)).toBeInTheDocument();
    });
  });

  describe('Populated / selected state', () => {
    it('reflects the selected category', () => {
      render(
        <FilterPanel {...defaultProps} selectedCategory="Design" />,
      );
      const selected = screen.getByText('Design');
      expect(selected).toBeInTheDocument();
    });

    it('reflects the selected level', () => {
      render(
        <FilterPanel {...defaultProps} selectedLevel="ADVANCED" />,
      );
      expect(screen.getByText(/advanced/i)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onCategoryChange when a category is clicked', () => {
      render(<FilterPanel {...defaultProps} />);
      fireEvent.click(screen.getByText('Marketing'));
      expect(defaultProps.onCategoryChange).toHaveBeenCalledWith('Marketing');
    });

    it('calls onLevelChange when a level is clicked', () => {
      render(<FilterPanel {...defaultProps} />);
      fireEvent.click(screen.getByText(/beginner/i));
      expect(defaultProps.onLevelChange).toHaveBeenCalledWith('BEGINNER');
    });

    it('does not call handlers on initial render', () => {
      render(<FilterPanel {...defaultProps} />);
      expect(defaultProps.onCategoryChange).not.toHaveBeenCalled();
      expect(defaultProps.onLevelChange).not.toHaveBeenCalled();
    });
  });
});
