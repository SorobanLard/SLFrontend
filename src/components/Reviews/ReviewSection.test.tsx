import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewSection } from './ReviewSection';
import type { Review } from '@/types';

// Stub child components so tests focus on ReviewSection behaviour.
vi.mock('./RatingSummary', () => ({
  RatingSummary: ({
    totalReviews,
    onStarFilter,
  }: {
    totalReviews: number;
    onStarFilter: (star: number | null) => void;
  }) => (
    <div data-testid="rating-summary">
      <span>{totalReviews} reviews</span>
      <button type="button" onClick={() => onStarFilter(5)}>
        Filter 5 stars
      </button>
    </div>
  ),
}));

vi.mock('./ReviewFilter', () => ({
  ReviewFilter: ({
    sortBy,
    onSortChange,
    totalReviews,
  }: {
    sortBy: string;
    onSortChange: (value: string) => void;
    totalReviews: number;
  }) => (
    <div data-testid="review-filter">
      <span>Showing {totalReviews}</span>
      <span>Sort: {sortBy}</span>
      <button type="button" onClick={() => onSortChange('highest_rated')}>
        Sort highest
      </button>
    </div>
  ),
}));

vi.mock('./ReviewCard', () => ({
  ReviewCard: ({ review }: { review: Review }) => (
    <div data-testid="review-card">{review.text}</div>
  ),
}));

vi.mock('./ReviewForm', () => ({
  ReviewForm: ({
    courseName,
    onSubmit,
  }: {
    courseName: string;
    onSubmit?: (rating: number, text: string) => Promise<void>;
  }) => (
    <form
      data-testid="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit?.(5, 'Great course');
      }}
    >
      <span>Form for {courseName}</span>
      <button type="submit">Submit review</button>
    </form>
  ),
}));

const makeReview = (overrides: Partial<Review> = {}): Review => ({
  id: 'r1',
  courseId: 'c1',
  authorName: 'Alice',
  rating: 5,
  text: 'Excellent course',
  createdAt: '2024-01-01T00:00:00.000Z',
  helpfulVotes: 3,
  ...overrides,
});

describe('ReviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the section heading', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[]}
        averageRating={0}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no reviews', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[]}
        averageRating={0}
      />,
    );
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(
      screen.getByText('Enroll to be the first to review this course.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('rating-summary')).not.toBeInTheDocument();
  });

  it('shows the enrolled empty-state message when canReview is true', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[]}
        averageRating={0}
        canReview
      />,
    );
    expect(
      screen.getByText('Be the first to share your experience with this course.'),
    ).toBeInTheDocument();
  });

  it('renders the populated state with summary, filter and review cards', () => {
    const reviews = [
      makeReview({ id: 'r1', text: 'First review' }),
      makeReview({ id: 'r2', text: 'Second review', rating: 4 }),
    ];
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={reviews}
        averageRating={4.5}
      />,
    );
    expect(screen.getByTestId('rating-summary')).toBeInTheDocument();
    expect(screen.getByTestId('review-filter')).toBeInTheDocument();
    expect(screen.getAllByTestId('review-card')).toHaveLength(2);
    expect(screen.getByText('First review')).toBeInTheDocument();
    expect(screen.getByText('Second review')).toBeInTheDocument();
  });

  it('does not render the review form when canReview is false', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview()]}
        averageRating={5}
      />,
    );
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

  it('renders the review form when canReview is true', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview()]}
        averageRating={5}
        canReview
      />,
    );
    expect(screen.getByText('Leave a Review')).toBeInTheDocument();
    expect(screen.getByTestId('review-form')).toBeInTheDocument();
  });

  it('shows the existing review heading when an existingReview is provided', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview()]}
        averageRating={5}
        canReview
        existingReview={{
          rating: 5,
          text: 'My review',
          authorName: 'Alice',
          date: '2024-01-01',
        }}
      />,
    );
    expect(screen.getByText('Your Review')).toBeInTheDocument();
  });

  it('calls onSubmitReview when the form is submitted', async () => {
    const onSubmitReview = vi.fn().mockResolvedValue(undefined);
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview()]}
        averageRating={5}
        canReview
        onSubmitReview={onSubmitReview}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    await waitFor(() => {
      expect(onSubmitReview).toHaveBeenCalledWith(5, 'Great course');
    });
  });

  it('filters reviews by star and shows the filtered empty state', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview({ id: 'r1', rating: 4, text: 'Four star' })]}
        averageRating={4}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filter 5 stars' }));
    expect(screen.getByText(/No 5-star reviews yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('review-card')).not.toBeInTheDocument();
  });

  it('clears the star filter when Clear filter is clicked', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview({ id: 'r1', rating: 4, text: 'Four star' })]}
        averageRating={4}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filter 5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(screen.getByText('Four star')).toBeInTheDocument();
  });

  it('updates the sort option when the filter changes sort', () => {
    render(
      <ReviewSection
        courseId="c1"
        courseName="Intro to Testing"
        reviews={[makeReview()]}
        averageRating={5}
      />,
    );
    expect(screen.getByText('Sort: most_recent')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sort highest' }));
    expect(screen.getByText('Sort: highest_rated')).toBeInTheDocument();
  });
});
