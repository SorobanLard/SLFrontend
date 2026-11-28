import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardSkeleton } from './DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a loading status region for assistive technology', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('exposes an accessible loading label', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('marks the skeleton as busy while loading', () => {
    render(<DashboardSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders multiple placeholder blocks to mirror the populated dashboard', () => {
    const { container } = render(<DashboardSkeleton />);
    const placeholders = container.querySelectorAll('[data-skeleton], .animate-pulse');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('does not render any interactive controls while loading', () => {
    render(<DashboardSkeleton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
