import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingPlansSection } from './PricingPlansSection';

// Mock the lib/utils module to keep assertions stable and independent of
// formatting helpers used elsewhere in the codebase.
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
  formatUsdc: vi.fn((price: number) => `$${price.toFixed(2)}`),
}));

const mockPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    description: 'Get started for free',
    features: ['Access to free courses', 'Community support'],
    ctaLabel: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    description: 'For serious learners',
    features: ['All courses', 'Priority support', 'Certificates'],
    ctaLabel: 'Go Pro',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 99,
    description: 'For teams and organizations',
    features: ['Everything in Pro', 'Team management', 'Dedicated support'],
    ctaLabel: 'Contact sales',
  },
];

describe('PricingPlansSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('renders a loading indicator when loading is true', () => {
      render(<PricingPlansSection plans={[]} loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render plan cards while loading', () => {
      render(<PricingPlansSection plans={mockPlans} loading />);
      expect(screen.queryByText('Starter')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders an empty message when there are no plans', () => {
      render(<PricingPlansSection plans={[]} />);
      expect(screen.getByText(/no plans available/i)).toBeInTheDocument();
    });
  });

  describe('Populated state', () => {
    it('renders a card for each plan', () => {
      render(<PricingPlansSection plans={mockPlans} />);
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
    });

    it('renders plan descriptions and features', () => {
      render(<PricingPlansSection plans={mockPlans} />);
      expect(screen.getByText('For serious learners')).toBeInTheDocument();
      expect(screen.getByText('All courses')).toBeInTheDocument();
      expect(screen.getByText('Priority support')).toBeInTheDocument();
    });

    it('renders formatted prices for each plan', () => {
      render(<PricingPlansSection plans={mockPlans} />);
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('$29.00')).toBeInTheDocument();
      expect(screen.getByText('$99.00')).toBeInTheDocument();
    });

    it('renders a CTA button for each plan', () => {
      render(<PricingPlansSection plans={mockPlans} />);
      expect(screen.getByRole('button', { name: 'Start free' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go Pro' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Contact sales' })).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls onSelectPlan with the plan id when a CTA is clicked', () => {
      const onSelectPlan = vi.fn();
      render(<PricingPlansSection plans={mockPlans} onSelectPlan={onSelectPlan} />);
      fireEvent.click(screen.getByRole('button', { name: 'Go Pro' }));
      expect(onSelectPlan).toHaveBeenCalledTimes(1);
      expect(onSelectPlan).toHaveBeenCalledWith('pro');
    });

    it('does not throw when no onSelectPlan handler is provided', () => {
      render(<PricingPlansSection plans={mockPlans} />);
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: 'Start free' })),
      ).not.toThrow();
    });
  });
});
