import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckoutSteps } from '../CheckoutSteps';

const mockSteps = [
  { label: 'Order Review', description: 'Review your cart' },
  { label: 'Payment', description: 'Complete payment' },
  { label: 'Confirmation', description: 'Order confirmed' },
];

describe('CheckoutSteps', () => {
  it('renders all steps', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    expect(screen.getByText('Order Review')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    expect(screen.getByText('Review your cart')).toBeInTheDocument();
    expect(screen.getByText('Complete payment')).toBeInTheDocument();
    expect(screen.getByText('Order confirmed')).toBeInTheDocument();
  });

  it('marks completed steps with a checkmark', () => {
    const { container } = render(<CheckoutSteps steps={mockSteps} currentStep={3} />);
    const svgs = container.querySelectorAll('svg');
    // Steps 1 and 2 should have checkmark SVGs (M5 13l4 4L19 7)
    const checkmarks = Array.from(svgs).filter((svg) =>
      svg.getAttribute('viewBox') === '0 0 24 24'
    );
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('marks the current step with aria-current="step"', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={2} />);
    const currentStep = screen.getByText('2').closest('[aria-current="step"]');
    expect(currentStep).toBeInTheDocument();
  });

  it('highlights the current step with border styling', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    const currentIndicator = screen.getByText('1').closest('span');
    expect(currentIndicator).toHaveClass('border-sorobanlard-primary');
  });

  it('renders step numbers for future and current steps', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={2} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('has a navigation role for accessibility', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    expect(screen.getByRole('navigation', { name: /checkout progress/i })).toBeInTheDocument();
  });

  it('renders an ordered list for steps', () => {
    render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    const list = screen.getByRole('navigation', { name: /checkout progress/i }).querySelector('ol');
    expect(list).toBeInTheDocument();
  });

  it('renders connecting lines between steps', () => {
    const { container } = render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    const lines = container.querySelectorAll('[aria-hidden="true"]');
    // Should have 2 lines between 3 steps
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('updates when currentStep changes', () => {
    const { rerender } = render(<CheckoutSteps steps={mockSteps} currentStep={1} />);
    expect(screen.getByText('1').closest('[aria-current="step"]')).toBeInTheDocument();

    rerender(<CheckoutSteps steps={mockSteps} currentStep={2} />);
    expect(screen.getByText('2').closest('[aria-current="step"]')).toBeInTheDocument();
  });

  it('styles completed steps differently from incomplete steps', () => {
    const { container } = render(<CheckoutSteps steps={mockSteps} currentStep={3} />);
    const completedStep = screen.getByText('1').closest('span');
    expect(completedStep).toHaveClass('bg-leaf-600');
    expect(completedStep).toHaveClass('text-white');
  });
});
