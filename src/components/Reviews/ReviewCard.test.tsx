import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewCard from './ReviewCard';

describe('ReviewCard', () => {
  const baseProps = {
    author: 'Jane Doe',
    rating: 4,
    comment: 'Great course, learned a lot!',
    date: '2024-01-15',
  };

  it('renders the author, comment and rating', () => {
    render(<ReviewCard {...baseProps} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Great course, learned a lot!')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders the formatted date', () => {
    render(<ReviewCard {...baseProps} />);

    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('renders an empty comment state gracefully', () => {
    render(<ReviewCard {...baseProps} comment="" />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Great course, learned a lot!')).not.toBeInTheDocument();
  });

  it('renders a loading state when loading prop is true', () => {
    render(<ReviewCard {...baseProps} loading />);

    expect(screen.getByTestId('review-card-loading')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<ReviewCard {...baseProps} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<ReviewCard {...baseProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
