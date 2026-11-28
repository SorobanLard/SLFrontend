import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SearchResultsLoadingState } from './SearchResultsLoadingState';

describe('SearchResultsLoadingState', () => {
  it('renders the loading status region', () => {
    render(<SearchResultsLoadingState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('exposes an accessible loading label', () => {
    render(<SearchResultsLoadingState />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders multiple skeleton placeholders', () => {
    const { container } = render(<SearchResultsLoadingState />);
    const skeletons = container.querySelectorAll('[data-testid="skeleton"], .animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('marks the region as busy for assistive technology', () => {
    render(<SearchResultsLoadingState />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});
