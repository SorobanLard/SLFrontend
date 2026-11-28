import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PricingTiers } from './PricingTiers';

// Mock the lib/utils module following the established pattern in CourseCard.test.tsx
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('PricingTiers', () => {
  describe('Populated state', () => {
    it('renders the section heading', () => {
      render(<PricingTiers />);
      expect(
        screen.getByRole('heading', { name: /pricing/i })
      ).toBeInTheDocument();
    });

    it('renders all pricing tier cards', () => {
      render(<PricingTiers />);
      const tiers = screen.getAllByRole('article');
      expect(tiers.length).toBeGreaterThan(0);
    });

    it('renders a call-to-action button for each tier', () => {
      render(<PricingTiers />);
      const ctaButtons = screen.getAllByRole('button');
      expect(ctaButtons.length).toBeGreaterThan(0);
    });
  });

  describe('User interaction', () => {
    it('invokes the onSelect callback when a tier CTA is clicked', () => {
      const onSelect = vi.fn();
      render(<PricingTiers onSelect={onSelect} />);
      const [firstButton] = screen.getAllByRole('button');
      fireEvent.click(firstButton);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty state', () => {
    it('renders an empty-state message when no tiers are provided', () => {
      render(<PricingTiers tiers={[]} />);
      expect(screen.getByText(/no pricing tiers/i)).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('renders a loading indicator when loading is true', () => {
      render(<PricingTiers loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
