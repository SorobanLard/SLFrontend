// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QnaSection } from '../QnaSection';

describe('QnaSection empty, loading, and error states (#204)', () => {
  it('renders loading state when isLoading is true', () => {
    render(<QnaSection questions={[]} isLoading />);
    expect(screen.getByTestId('qna-loading')).toBeInTheDocument();
  });

  it('renders error state with retry action when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <QnaSection
        questions={[]}
        error="Failed to load lesson discussions"
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('qna-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load lesson discussions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when a lesson has no questions yet', () => {
    render(<QnaSection lessonTitle="Intro to Pattern Drafting" questions={[]} />);
    expect(screen.getByTestId('qna-empty')).toBeInTheDocument();
    expect(screen.getByText('No questions yet')).toBeInTheDocument();
  });
});
