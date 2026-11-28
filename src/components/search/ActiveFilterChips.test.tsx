import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActiveFilterChips } from './ActiveFilterChips';

describe('ActiveFilterChips', () => {
  it('renders nothing when there are no active filters', () => {
    const { container } = render(
      <ActiveFilterChips filters={{}} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a chip for each active filter', () => {
    render(
      <ActiveFilterChips
        filters={{ category: 'Web Development', level: 'INTERMEDIATE' }}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );
    expect(screen.getByText(/web development/i)).toBeInTheDocument();
    expect(screen.getByText(/intermediate/i)).toBeInTheDocument();
  });

  it('calls onRemove with the filter key when a chip is clicked', () => {
    const onRemove = vi.fn();
    render(
      <ActiveFilterChips
        filters={{ category: 'Web Development' }}
        onRemove={onRemove}
        onClearAll={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /remove.*web development/i }));
    expect(onRemove).toHaveBeenCalledWith('category');
  });

  it('calls onClearAll when the clear-all control is clicked', () => {
    const onClearAll = vi.fn();
    render(
      <ActiveFilterChips
        filters={{ category: 'Web Development', level: 'INTERMEDIATE' }}
        onRemove={vi.fn()}
        onClearAll={onClearAll}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
