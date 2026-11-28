import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoplayCountdown } from './AutoplayCountdown';

describe('AutoplayCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the initial countdown value', () => {
    render(<AutoplayCountdown seconds={5} onComplete={vi.fn()} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('decrements the countdown as time passes', () => {
    render(<AutoplayCountdown seconds={5} onComplete={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('calls onComplete when the countdown reaches zero', () => {
    const onComplete = vi.fn();
    render(<AutoplayCountdown seconds={3} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete before the countdown finishes', () => {
    const onComplete = vi.fn();
    render(<AutoplayCountdown seconds={3} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('cancels the countdown when the cancel control is clicked', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(
      <AutoplayCountdown seconds={3} onComplete={onComplete} onCancel={onCancel} />
    );
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
