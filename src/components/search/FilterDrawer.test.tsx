import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterDrawer } from './FilterDrawer';

// Mock the lib/utils module to keep class assertions stable
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  children: <div>Filter content</div>,
};

describe('FilterDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders children when open', () => {
      render(<FilterDrawer {...defaultProps} />);
      expect(screen.getByText('Filter content')).toBeInTheDocument();
    });

    it('does not render children when closed', () => {
      render(<FilterDrawer {...defaultProps} open={false} />);
      expect(screen.queryByText('Filter content')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when the close button is clicked', () => {
      render(<FilterDrawer {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked', () => {
      render(<FilterDrawer {...defaultProps} />);
      const backdrop = screen.getByTestId('filter-drawer-backdrop');
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', () => {
      render(<FilterDrawer {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
