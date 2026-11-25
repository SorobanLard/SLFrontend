import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QnaQuestionForm } from './QnaQuestionForm';

describe('QnaQuestionForm', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with its input and submit button', () => {
    render(<QnaQuestionForm onSubmit={onSubmit} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post|submit|ask/i })).toBeInTheDocument();
  });

  it('disables the submit button when the input is empty', () => {
    render(<QnaQuestionForm onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: /post|submit|ask/i })).toBeDisabled();
  });

  it('enables the submit button once the user types a question', () => {
    render(<QnaQuestionForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'How do I reset my progress?' },
    });
    expect(screen.getByRole('button', { name: /post|submit|ask/i })).toBeEnabled();
  });

  it('calls onSubmit with the typed question when submitted', async () => {
    render(<QnaQuestionForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'How do I reset my progress?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post|submit|ask/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith('How do I reset my progress?');
  });

  it('clears the input after a successful submit', async () => {
    render(<QnaQuestionForm onSubmit={onSubmit} />);
    const input = screen.getByRole('textbox') as HTMLTextAreaElement | HTMLInputElement;
    fireEvent.change(input, { target: { value: 'A question' } });
    fireEvent.click(screen.getByRole('button', { name: /post|submit|ask/i }));
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('shows a loading state while submitting', () => {
    render(<QnaQuestionForm onSubmit={onSubmit} loading />);
    expect(screen.getByRole('button', { name: /post|submit|ask|sending|loading/i })).toBeDisabled();
  });

  it('does not submit when the input is only whitespace', () => {
    render(<QnaQuestionForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /post|submit|ask/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
