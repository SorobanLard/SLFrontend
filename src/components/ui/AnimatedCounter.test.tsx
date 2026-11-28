import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnimatedCounter from './AnimatedCounter';

describe('AnimatedCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the target value when animation is disabled', () => {
    render(<AnimatedCounter value={42} duration={0} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a prefix and suffix around the value', () => {
    render(<AnimatedCounter value={100} duration={0} prefix="$" suffix="+" />);
    expect(screen.getByText(/\$100\+/)).toBeInTheDocument();
  });

  it('renders zero as the empty/default state', () => {
    render(<AnimatedCounter value={0} duration={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('animates from the start value up to the target value', () => {
    render(<AnimatedCounter value={100} duration={1000} />);

    // Initial render starts at 0.
    expect(screen.getByText('0')).toBeInTheDocument();

    // Advance partway through the animation.
    vi.advanceTimersByTime(500);
    expect(screen.queryByText('0')).not.toBeInTheDocument();

    // Advance past the end; final value should be reached.
    vi.advanceTimersByTime(1000);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('respects a custom start value', () => {
    render(<AnimatedCounter value={50} start={10} duration={0} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('applies a custom className to the rendered element', () => {
    const { container } = render(
      <AnimatedCounter value={7} duration={0} className="custom-counter" />
    );
    expect(container.querySelector('.custom-counter')).toBeInTheDocument();
  });
});
