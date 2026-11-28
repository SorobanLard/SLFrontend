import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DidYouMean } from './DidYouMean';

describe('DidYouMean', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there is no suggestion', () => {
    const { container } = render(
      <DidYouMean query="react" suggestion={null} onSelect={onSelect} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the suggestion matches the query', () => {
    const { container } = render(
      <DidYouMean query="react" suggestion="react" onSelect={onSelect} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the suggestion when it differs from the query', () => {
    render(<DidYouMean query="recat" suggestion="react" onSelect={onSelect} />);
    expect(screen.getByText(/did you mean/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /react/i })).toBeInTheDocument();
  });

  it('calls onSelect with the suggestion when clicked', () => {
    render(<DidYouMean query="recat" suggestion="react" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /react/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('react');
  });

  it('does not call onSelect before interaction', () => {
    render(<DidYouMean query="recat" suggestion="react" onSelect={onSelect} />);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
