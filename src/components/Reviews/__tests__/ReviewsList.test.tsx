// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewsList from '../ReviewsList';

describe('ReviewsList empty, loading, and error states (#203)', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<ReviewsList reviews={[]} isLoading />);
    expect(screen.getByTestId('reviews-loading')).toBeInTheDocument();
  });

  it('renders error state with retry callback when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <ReviewsList
        reviews={[]}
        error="Failed to load course reviews"
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('reviews-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load course reviews')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when reviews list is empty', () => {
    render(<ReviewsList reviews={[]} />);
    expect(screen.getByTestId('reviews-empty')).toBeInTheDocument();
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });
});
