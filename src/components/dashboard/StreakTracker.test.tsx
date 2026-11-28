import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakTracker from './StreakTracker';

describe('StreakTracker', () => {
  it('renders without crashing', () => {
    render(<StreakTracker />);
    expect(document.body).toBeTruthy();
  });

  it('renders a streak value when provided', () => {
    render(<StreakTracker streak={5} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('renders a zero streak', () => {
    render(<StreakTracker streak={0} />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<StreakTracker streak={3} label="Day streak" />);
    expect(screen.getByText(/Day streak/i)).toBeInTheDocument();
  });

  it('renders a large streak value', () => {
    render(<StreakTracker streak={365} />);
    expect(screen.getByText(/365/)).toBeInTheDocument();
  });
});
