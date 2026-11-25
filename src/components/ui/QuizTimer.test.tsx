import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import QuizTimer from './QuizTimer';

describe('QuizTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the initial time remaining', () => {
    render(<QuizTimer durationSeconds={90} />);

    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('counts down as time passes', () => {
    render(<QuizTimer durationSeconds={90} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('01:25')).toBeInTheDocument();
  });

  it('calls onExpire when the timer reaches zero', () => {
    const onExpire = vi.fn();
    render(<QuizTimer durationSeconds={3} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('does not call onExpire before the timer reaches zero', () => {
    const onExpire = vi.fn();
    render(<QuizTimer durationSeconds={10} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(onExpire).not.toHaveBeenCalled();
  });
});
