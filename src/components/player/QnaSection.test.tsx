// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QnaSection } from './QnaSection';
import type { QnaQuestion } from '@/types';

describe('QnaSection states (#204)', () => {
  it('renders loading state when isLoading is true', () => {
    render(<QnaSection lessonTitle="Intro to Soroban" questions={[]} isLoading />);

    expect(screen.getByTestId('qna-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading lesson questions/i)).toBeInTheDocument();
  });

  it('renders error state and invokes onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <QnaSection
        lessonTitle="Intro to Soroban"
        questions={[]}
        error="Network error while fetching lesson Q&A."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('qna-error')).toBeInTheDocument();
    expect(
      screen.getByText(/unable to load questions for this lesson/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/network error while fetching lesson q&a/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when a lesson has no questions yet', () => {
    render(<QnaSection lessonTitle="Intro to Soroban" questions={[]} />);

    expect(screen.getByTestId('qna-empty')).toBeInTheDocument();
    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/be the first to ask something about this lesson/i),
    ).toBeInTheDocument();
  });

  it('renders populated question list when questions exist', () => {
    const questions: QnaQuestion[] = [
      {
        id: 'q-1',
        authorName: 'Zainab',
        authorAvatarUrl: null,
        isViewerAuthor: false,
        title: 'How do storage TTLs work in Soroban?',
        body: 'Can persistent storage entries expire if not bumped?',
        createdAt: '2026-03-05T12:00:00Z',
        upvotes: 3,
        viewerUpvoted: false,
        replies: [],
      },
    ];

    render(<QnaSection lessonTitle="Intro to Soroban" questions={questions} />);

    expect(
      screen.getByText('How do storage TTLs work in Soroban?'),
    ).toBeInTheDocument();
  });
});
