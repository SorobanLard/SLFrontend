import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyResults } from './EmptyResults';

describe('EmptyResults', () => {
  it('renders the default empty state message', () => {
    render(<EmptyResults />);
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('renders a custom message when provided', () => {
    render(<EmptyResults message="Nothing matches your filters" />);
    expect(screen.getByText(/nothing matches your filters/i)).toBeInTheDocument();
  });

  it('renders a reset button when onReset is provided', () => {
    render(<EmptyResults onReset={vi.fn()} />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('does not render a reset button when onReset is omitted', () => {
    render(<EmptyResults />);
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('calls onReset when the reset button is clicked', () => {
    const onReset = vi.fn();
    render(<EmptyResults onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
