import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderReview } from '../OrderReview';
import type { CartItem } from '@/lib/hooks/use-cart-store';

vi.mock('@/lib/hooks/use-cart-store', () => ({
  useCartStore: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, fill, className }: any) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
      />
    );
  },
}));

vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  },
}));

vi.mock('@/lib/utils', () => ({
  formatUsdc: vi.fn((price: number) => `$${price.toFixed(2)}`),
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockCartItems: CartItem[] = [
  {
    courseId: 'course-1',
    course: {
      id: 'course-1',
      title: 'React Basics',
      price: 50.00,
      category: 'Web Development',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      instructor: { id: 'instr-1', name: 'John Doe', avatarUrl: null },
      description: '',
      level: 'BEGINNER',
      originalPrice: 100,
      totalDuration: 3600,
      totalLessons: 24,
      rating: 4.5,
      reviewCount: 100,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    courseId: 'course-2',
    course: {
      id: 'course-2',
      title: 'Advanced React',
      price: 75.00,
      category: 'Web Development',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      instructor: { id: 'instr-2', name: 'Jane Smith', avatarUrl: null },
      description: '',
      level: 'ADVANCED',
      originalPrice: 150,
      totalDuration: 7200,
      totalLessons: 48,
      rating: 4.8,
      reviewCount: 200,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

const { useCartStore } = await import('@/lib/hooks/use-cart-store');

describe('OrderReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Cart', () => {
    it('shows empty state when cart is empty', () => {
      (useCartStore as any).mockReturnValue({
        items: [],
        removeItem: vi.fn(),
        getTotalPrice: vi.fn(() => 0),
      });

      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText(/there's nothing to pay for/i)).toBeInTheDocument();
    });

    it('displays a link to browse courses', () => {
      (useCartStore as any).mockReturnValue({
        items: [],
        removeItem: vi.fn(),
        getTotalPrice: vi.fn(() => 0),
      });

      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByRole('link', { name: /browse courses/i })).toBeInTheDocument();
    });
  });

  describe('Items Display', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: mockCartItems,
        removeItem: vi.fn(),
        getTotalPrice: vi.fn(() => 125.00),
      });
    });

    it('renders all cart items', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText('React Basics')).toBeInTheDocument();
      expect(screen.getByText('Advanced React')).toBeInTheDocument();
    });

    it('displays course categories', () => {
      render(<OrderReview onNext={vi.fn()} />);
      const categoryElements = screen.getAllByText('Web Development');
      expect(categoryElements.length).toBeGreaterThan(0);
    });

    it('displays instructor names', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays lifetime access and certificate badges', () => {
      render(<OrderReview onNext={vi.fn()} />);
      const lifeTimeElements = screen.getAllByText(/lifetime access/i);
      expect(lifeTimeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Price Breakdown', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: mockCartItems,
        removeItem: vi.fn(),
        getTotalPrice: vi.fn(() => 125.00),
      });
    });

    it('displays subtotal', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
    });

    it('calculates and displays platform fee (2.5%)', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText(/platform fee \(2\.5%\)/i)).toBeInTheDocument();
    });

    it('displays total before promo is applied', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });

    it('shows correct course count in subtotal label', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByText(/subtotal \(2 courses\)/i)).toBeInTheDocument();
    });
  });

  describe('Promo Code', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: mockCartItems,
        removeItem: vi.fn(),
        getTotalPrice: vi.fn(() => 125.00),
      });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders promo code input when no promo is applied', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByPlaceholderText(/enter promo code/i)).toBeInTheDocument();
    });

    it('shows apply button for promo code', () => {
      render(<OrderReview onNext={vi.fn()} />);
      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).toBeInTheDocument();
    });

    it('disables apply button when input is empty', () => {
      render(<OrderReview onNext={vi.fn()} />);
      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).toBeDisabled();
    });

    it('enables apply button when promo code is entered', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'LEARN10');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).not.toBeDisabled();
    });

    it('shows error for invalid promo code', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'INVALID');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired promo code/i)).toBeInTheDocument();
      });
    });

    it('applies LEARN10 promo code successfully', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'LEARN10');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/learn10 — 10% discount applied/i)).toBeInTheDocument();
      });
    });

    it('applies STUDENT promo code successfully', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'STUDENT');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/student — 10% discount applied/i)).toBeInTheDocument();
      });
    });

    it('shows remove button for applied promo', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'LEARN10');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
    });

    it('removes applied promo when remove button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'LEARN10');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/learn10 — 10% discount applied/i)).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter promo code/i)).toBeInTheDocument();
      });
    });

    it('displays discount in price breakdown when applied', async () => {
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'LEARN10');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/discount \(10%\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Item Removal', () => {
    it('calls removeItem when remove button is clicked', async () => {
      const mockRemoveItem = vi.fn();
      (useCartStore as any).mockReturnValue({
        items: mockCartItems,
        removeItem: mockRemoveItem,
        getTotalPrice: vi.fn(() => 125.00),
      });

      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={vi.fn()} />);
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(mockRemoveItem).toHaveBeenCalledWith('course-1');
    });
  });

  describe('Continue Button', () => {
    beforeEach(() => {
      (useCartStore as any).mockReturnValue({
        items: mockCartItems,
        removeItem: vi.fn(),
        getTotalPrice: vi.fn(() => 125.00),
      });
    });

    it('renders continue to payment button', () => {
      render(<OrderReview onNext={vi.fn()} />);
      expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument();
    });

    it('calls onNext with discount amount when button is clicked', async () => {
      const onNext = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={onNext} />);

      const continueButton = screen.getByRole('button', { name: /continue to payment/i });
      await user.click(continueButton);

      expect(onNext).toHaveBeenCalledWith(0);
    });

    it('calls onNext with correct discount when promo is applied', async () => {
      const onNext = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<OrderReview onNext={onNext} />);

      const input = screen.getByPlaceholderText(/enter promo code/i);
      await user.type(input, 'LEARN10');
      const applyButton = screen.getByRole('button', { name: /apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/learn10 — 10% discount applied/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue to payment/i });
      await user.click(continueButton);

      expect(onNext).toHaveBeenCalledWith(12.50);
    });
  });
});
