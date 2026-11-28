import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';

// Mock the lib/utils module following the CourseCard.test.tsx pattern
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const baseQuestion = {
  id: 'q-1',
  prompt: 'What is the capital of France?',
  options: [
    { id: 'a', text: 'Paris' },
    { id: 'b', text: 'London' },
    { id: 'c', text: 'Berlin' },
  ],
};

describe('QuestionCard', () => {
  it('renders the question prompt', () => {
    render(<QuestionCard question={baseQuestion} />);
    expect(screen.getByText(/what is the capital of france/i)).toBeInTheDocument();
  });

  it('renders all answer options', () => {
    render(<QuestionCard question={baseQuestion} />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });

  it('renders options as interactive buttons', () => {
    render(<QuestionCard question={baseQuestion} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(baseQuestion.options.length);
  });

  it('calls onSelect when an option is clicked', () => {
    const onSelect = vi.fn();
    render(<QuestionCard question={baseQuestion} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Paris'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('renders an empty state when no options are provided', () => {
    render(<QuestionCard question={{ ...baseQuestion, options: [] }} />);
    expect(screen.getByText(/what is the capital of france/i)).toBeInTheDocument();
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
  });

  it('renders a loading state when loading is true', () => {
    render(<QuestionCard question={baseQuestion} loading />);
    expect(screen.getByText(/what is the capital of france/i)).toBeInTheDocument();
  });
});
