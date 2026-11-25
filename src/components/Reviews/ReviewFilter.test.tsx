import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewFilter from './ReviewFilter';

describe('ReviewFilter', () => {
  it('renders the filter controls', () => {
    render(<ReviewFilter />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders the default/empty state', () => {
    render(<ReviewFilter />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(/no reviews/i)).not.toBeInTheDocument();
  });

  it('renders with a selected value when provided', () => {
    render(<ReviewFilter value="5" onChange={() => {}} />);

    expect(screen.getByRole('combobox')).toHaveValue('5');
  });

  it('calls onChange when the user selects a filter option', () => {
    const handleChange = vi.fn();
    render(<ReviewFilter value="" onChange={handleChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
