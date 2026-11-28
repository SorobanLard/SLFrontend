import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseCompletionModal } from './CourseCompletionModal';

// Mock next/link so anchors render as plain <a> elements in jsdom
vi.mock('next/link', () => ({
  default: function MockLink({ href, children, ...rest }: any) {
    return (
      <a href={typeof href === 'string' ? href : '#'} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock the lib/utils module used for class merging
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('CourseCompletionModal', () => {
  const defaultProps = {
    open: true,
    courseTitle: 'Advanced React Patterns',
    onClose: vi.fn(),
    onRate: vi.fn(),
    onDownloadCertificate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders nothing when open is false', () => {
      const { container } = render(
        <CourseCompletionModal {...defaultProps} open={false} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders the modal when open is true', () => {
      render(<CourseCompletionModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Populated state', () => {
    it('displays the course title', () => {
      render(<CourseCompletionModal {...defaultProps} />);
      expect(screen.getByText(/advanced react patterns/i)).toBeInTheDocument();
    });

    it('displays a completion congratulation message', () => {
      render(<CourseCompletionModal {...defaultProps} />);
      expect(screen.getByText(/congrat/i)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when the close button is clicked', () => {
      render(<CourseCompletionModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onDownloadCertificate when the certificate button is clicked', () => {
      render(<CourseCompletionModal {...defaultProps} />);
      fireEvent.click(
        screen.getByRole('button', { name: /certificate/i })
      );
      expect(defaultProps.onDownloadCertificate).toHaveBeenCalledTimes(1);
    });

    it('calls onRate with the selected rating when a star is clicked', () => {
      render(<CourseCompletionModal {...defaultProps} />);
      const stars = screen.getAllByRole('button', { name: /rate/i });
      fireEvent.click(stars[4]);
      expect(defaultProps.onRate).toHaveBeenCalledWith(5);
    });
  });
});
