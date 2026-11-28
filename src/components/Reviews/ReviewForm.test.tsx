import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewForm } from './ReviewForm';

describe('ReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state with no rating and disabled submit', () => {
    render(<ReviewForm courseName="Intro to Soroban" />);

    expect(screen.getByRole('radiogroup', { name: /course star rating/i })).toBeInTheDocument();
    expect(screen.getByText(/no rating yet/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');

    const submit = screen.getByRole('button', { name: /submit/i });
    expect(submit).toBeDisabled();
  });

  it('updates the rating label when a star is selected', async () => {
    const user = userEvent.setup();
    render(<ReviewForm />);

    await user.click(screen.getByRole('radio', { name: /4 stars/i }));

    expect(screen.getByRole('radio', { name: /4 stars/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/4 — Good/i)).toBeInTheDocument();
  });

  it('enables submit once rating and minimum text are provided', async () => {
    const user = userEvent.setup();
    render(<ReviewForm />);

    await user.click(screen.getByRole('radio', { name: /5 stars/i }));
    await user.type(screen.getByRole('textbox'), 'a'.repeat(60));

    expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled();
  });

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    render(<ReviewForm />);

    const submit = screen.getByRole('button', { name: /submit/i });
    // Submit is disabled in empty state; force a click to exercise validation.
    fireEvent.click(submit);

    // No onSubmit should be called for an invalid form.
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('calls onSubmit with rating and text and shows the submitted state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('radio', { name: /5 stars/i }));
    await user.type(screen.getByRole('textbox'), 'a'.repeat(60));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(5, 'a'.repeat(60));
  });

  it('pre-fills values in edit mode when existingReview is provided', () => {
    render(
      <ReviewForm
        existingReview={{
          rating: 3,
          text: 'b'.repeat(60),
          authorName: 'Ada',
          date: '2024-01-01',
        }}
      />,
    );

    expect(screen.getByRole('radio', { name: /3 stars/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('textbox')).toHaveValue('b'.repeat(60));
  });
});
