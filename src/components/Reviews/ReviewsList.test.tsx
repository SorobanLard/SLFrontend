// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewsList from './ReviewsList';

describe('ReviewsList states (#203)', () => {
  it('renders loading state when isLoading is true', () => {
    render(<ReviewsList reviews={[]} isLoading />);

    expect(screen.getByTestId('reviews-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading course reviews/i)).toBeInTheDocument();
  });

  it('renders error state and invokes onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <ReviewsList
        reviews={[]}
        error="Could not load course reviews from server."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('reviews-error')).toBeInTheDocument();
    expect(screen.getByText(/unable to load reviews/i)).toBeInTheDocument();
    expect(
      screen.getByText(/could not load course reviews from server/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when a course has no reviews yet', () => {
    render(<ReviewsList reviews={[]} />);

    expect(screen.getByTestId('reviews-empty')).toBeInTheDocument();
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/be the first student to leave a review/i),
    ).toBeInTheDocument();
  });

  it('renders populated reviews when reviews are provided', () => {
    render(
      <ReviewsList
        reviews={[
          {
            id: 'rev-1',
            reviewer: { name: 'Chidi Obi' },
            rating: 5,
            date: '2026-03-01',
            comment: 'Crystal-clear walkthrough of Soroban smart contracts!',
            helpfulCount: 4,
          },
        ]}
      />,
    );

    expect(screen.getByText('Chidi Obi')).toBeInTheDocument();
    expect(
      screen.getByText('Crystal-clear walkthrough of Soroban smart contracts!'),
    ).toBeInTheDocument();
  });
});
