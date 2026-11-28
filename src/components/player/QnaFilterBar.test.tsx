import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QnaFilterBar from './QnaFilterBar';

describe('QnaFilterBar', () => {
  it('renders the filter bar with representative props', () => {
    render(
      <QnaFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the empty state when there are no questions', () => {
    render(
      <QnaFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="all"
        onFilterChange={vi.fn()}
        questionCount={0}
      />
    );

    expect(screen.getByText(/no questions/i)).toBeInTheDocument();
  });

  it('renders the populated state with a question count', () => {
    render(
      <QnaFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="all"
        onFilterChange={vi.fn()}
        questionCount={5}
      />
    );

    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('renders the loading state', () => {
    render(
      <QnaFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="all"
        onFilterChange={vi.fn()}
        isLoading
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls onSearchChange when the user types in the search input', () => {
    const onSearchChange = vi.fn();
    render(
      <QnaFilterBar
        searchQuery=""
        onSearchChange={onSearchChange}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'hooks' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('hooks');
  });

  it('calls onFilterChange when a filter button is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <QnaFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        activeFilter="all"
        onFilterChange={onFilterChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /unanswered/i }));

    expect(onFilterChange).toHaveBeenCalledWith('unanswered');
  });
});
