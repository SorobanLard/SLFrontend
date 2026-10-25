import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationStep } from '../ConfirmationStep';
import type { CartItem } from '@/lib/hooks/use-cart-store';

vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  },
}));

vi.mock('@/lib/utils', () => ({
  formatUsdc: vi.fn((price: number) => `$${price.toFixed(2)}`),
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockReceipt = {
  items: [
    {
      courseId: 'course-1',
      course: {
        id: 'course-1',
        title: 'React Basics',
        price: 50.00,
        category: 'Web Development',
        instructor: { id: 'instr-1', name: 'John Doe', avatarUrl: null },
        description: '',
        level: 'BEGINNER',
        originalPrice: 100,
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        totalDuration: 3600,
        totalLessons: 24,
        rating: 4.5,
        reviewCount: 100,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as CartItem,
    {
      courseId: 'course-2',
      course: {
        id: 'course-2',
        title: 'Advanced React',
        price: 75.00,
        category: 'Web Development',
        instructor: { id: 'instr-2', name: 'Jane Smith', avatarUrl: null },
        description: '',
        level: 'ADVANCED',
        originalPrice: 150,
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        totalDuration: 7200,
        totalLessons: 48,
        rating: 4.8,
        reviewCount: 200,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as CartItem,
  ] as CartItem[],
  total: 128.13,
  transactionId: 'txn_1234567890_abc123',
};

describe('ConfirmationStep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Success Message', () => {
    it('renders payment received heading', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/payment received!/i)).toBeInTheDocument();
    });

    it('displays the charged amount', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/\$128\.13/)).toBeInTheDocument();
    });

    it('displays course count in confirmation message', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/you now have access to 2 courses/i)).toBeInTheDocument();
    });

    it('displays transaction ID', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/txn_1234567890_abc123/)).toBeInTheDocument();
    });
  });

  describe('Enrolled Courses', () => {
    it('displays enrolled courses section', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/enrolled courses/i)).toBeInTheDocument();
    });

    it('lists all enrolled courses', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText('React Basics')).toBeInTheDocument();
      expect(screen.getByText('Advanced React')).toBeInTheDocument();
    });

    it('displays instructor names for each course', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('provides links to start learning for each course', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      const links = screen.getAllByText(/start learning/i);
      expect(links).toHaveLength(mockReceipt.items.length);
      expect(links[0].closest('a')).toHaveAttribute(
        'href',
        `/dashboard/courses/${mockReceipt.items[0].courseId}`
      );
    });
  });

  describe('Action Buttons', () => {
    it('renders go to my courses button', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByRole('link', { name: /go to my courses/i })).toBeInTheDocument();
    });

    it('renders download receipt button', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByRole('button', { name: /download receipt/i })).toBeInTheDocument();
    });

    it('go to my courses button links to dashboard', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      const link = screen.getByRole('link', { name: /go to my courses/i });
      expect(link).toHaveAttribute('href', '/dashboard/courses');
    });

    it('download receipt button is not loading by default', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      const button = screen.getByRole('button', { name: /download receipt/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Certificate Badge', () => {
    it('displays certificate badge', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/you've earned/i)).toBeInTheDocument();
    });

    it('shows correct number of certificates', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/you've earned 2/i)).toBeInTheDocument();
    });

    it('uses singular form for single certificate', async () => {
      const singleItemReceipt = {
        ...mockReceipt,
        items: [mockReceipt.items[0]],
      };
      render(<ConfirmationStep receipt={singleItemReceipt} />);
      expect(screen.getByText(/you've earned 1 new course certificate!/i)).toBeInTheDocument();
    });

    it('uses plural form for multiple certificates', async () => {
      render(<ConfirmationStep receipt={mockReceipt} />);
      expect(screen.getByText(/new course certificates!/i)).toBeInTheDocument();
    });
  });

  describe('Single Course Receipt', () => {
    it('displays correct message for single course', async () => {
      const singleItemReceipt = {
        ...mockReceipt,
        items: [mockReceipt.items[0]],
        total: 51.25,
      };
      render(<ConfirmationStep receipt={singleItemReceipt} />);
      expect(screen.getByText(/you now have access to 1 course/i)).toBeInTheDocument();
    });
  });

  describe('Download Receipt', () => {
    it('calls handleDownloadReceipt when download button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ConfirmationStep receipt={mockReceipt} />);
      const downloadButton = screen.getByRole('button', { name: /download receipt/i });
      await user.click(downloadButton);
      // The button should show loading state briefly
      expect(downloadButton).toBeInTheDocument();
    });

    it('shows loading text while downloading', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ConfirmationStep receipt={mockReceipt} />);
      const downloadButton = screen.getByRole('button', { name: /download receipt/i });
      await user.click(downloadButton);

      // Should show generating state
      await waitFor(() => {
        expect(screen.getByText(/generating.../i)).toBeInTheDocument();
      });
    });
  });

  describe('Animations', () => {
    it('initially renders with animation disabled', () => {
      const { container } = render(<ConfirmationStep receipt={mockReceipt} />);
      const successCard = container.querySelector('.shadow-card');
      expect(successCard).toHaveClass('translate-y-4', 'opacity-0');
    });

    it('enables animations after mount', async () => {
      const { container } = render(<ConfirmationStep receipt={mockReceipt} />);
      vi.advanceTimersByTime(100);

      await waitFor(() => {
        const successCard = container.querySelector('.shadow-card');
        expect(successCard).toHaveClass('translate-y-0', 'opacity-100');
      });
    });

    it('animates checkmark with delay', async () => {
      const { container } = render(<ConfirmationStep receipt={mockReceipt} />);
      vi.advanceTimersByTime(100);

      await waitFor(() => {
        const checkmarkContainer = container.querySelector('.bg-leaf-100');
        expect(checkmarkContainer).toHaveClass('scale-100', 'opacity-100');
      });
    });
  });
});
