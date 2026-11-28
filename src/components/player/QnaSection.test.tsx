import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QnaSection } from './QnaSection';

// Mock the lib/utils module to keep class-name helpers deterministic.
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('QnaSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('renders a loading indicator when loading is true', () => {
      render(<QnaSection loading />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('does not render the empty state while loading', () => {
      render(<QnaSection loading />);
      expect(screen.queryByText(/no questions/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders the empty message when there are no questions', () => {
      render(<QnaSection questions={[]} />);
      expect(screen.getByText(/no questions/i)).toBeInTheDocument();
    });
  });

  describe('Populated state', () => {
    const questions = [
      { id: 'q1', author: 'Alice', body: 'How do I install the course?', answer: 'Check the setup guide.' },
      { id: 'q2', author: 'Bob', body: 'Is there a certificate?', answer: null },
    ];

    it('renders each question body', () => {
      render(<QnaSection questions={questions} />);
      expect(screen.getByText('How do I install the course?')).toBeInTheDocument();
      expect(screen.getByText('Is there a certificate?')).toBeInTheDocument();
    });

    it('renders the author for each question', () => {
      render(<QnaSection questions={questions} />);
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
      expect(screen.getByText(/bob/i)).toBeInTheDocument();
    });

    it('renders answers when present', () => {
      render(<QnaSection questions={questions} />);
      expect(screen.getByText('Check the setup guide.')).toBeInTheDocument();
    });
  });

  describe('User interaction', () => {
    it('calls onSubmit with the typed question when the form is submitted', () => {
      const onSubmit = vi.fn();
      render(<QnaSection questions={[]} onSubmit={onSubmit} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'What is the refund policy?' } });
      fireEvent.submit(input.closest('form') as HTMLFormElement);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('What is the refund policy?');
    });

    it('does not submit an empty question', () => {
      const onSubmit = vi.fn();
      render(<QnaSection questions={[]} onSubmit={onSubmit} />);

      const input = screen.getByRole('textbox');
      fireEvent.submit(input.closest('form') as HTMLFormElement);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
