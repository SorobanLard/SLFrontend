import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AnimatedCounter } from './AnimatedCounter';

// @ts-expect-error - jsdom has no IntersectionObserver
global.IntersectionObserver = class { observe() {} disconnect() {} };

describe('AnimatedCounter', () => {
  it('renders starting at 0 with prefix and suffix', () => {
    render(<AnimatedCounter value={500} prefix="$" suffix="+" />);
    expect(screen.getByText('$0+')).toBeInTheDocument();
  });
});
