import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StripeProvider } from './StripeProvider';

const mockLoadStripe = vi.fn();

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: (...args: unknown[]) => mockLoadStripe(...args),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
}));

describe('StripeProvider', () => {
  beforeEach(() => {
    mockLoadStripe.mockReset();
    mockLoadStripe.mockResolvedValue({});
  });

  it('renders children wrapped in Elements with a provided publishable key', () => {
    render(
      <StripeProvider publishableKey="pk_test_123">
        <div>Checkout content</div>
      </StripeProvider>
    );

    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    expect(screen.getByText('Checkout content')).toBeInTheDocument();
    expect(mockLoadStripe).toHaveBeenCalledWith('pk_test_123');
  });

  it('renders children when no publishable key is provided', () => {
    render(
      <StripeProvider>
        <div>Checkout content</div>
      </StripeProvider>
    );

    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    expect(screen.getByText('Checkout content')).toBeInTheDocument();
  });

  it('renders children when the publishable key is an empty string', () => {
    render(
      <StripeProvider publishableKey="">
        <div>Checkout content</div>
      </StripeProvider>
    );

    expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    expect(screen.getByText('Checkout content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <StripeProvider publishableKey="pk_test_123">
        <span>First</span>
        <span>Second</span>
      </StripeProvider>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
