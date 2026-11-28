import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RatingSummary from './RatingSummary';

describe('RatingSummary', () => {
  it('renders the average rating and total count when populated', () => {
    render(<RatingSummary averageRating={4.5} totalReviews={12} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('renders an empty state when there are no reviews', () => {
    render(<RatingSummary averageRating={0} totalReviews={0} />);

    expect(screen.getByText(/no reviews/i)).toBeInTheDocument();
  });

  it('renders a loading state when loading is true', () => {
    render(<RatingSummary averageRating={0} totalReviews={0} loading />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('rounds the average rating to one decimal place', () => {
    render(<RatingSummary averageRating={3.666} totalReviews={3} />);

    expect(screen.getByText('3.7')).toBeInTheDocument();
  });
});
