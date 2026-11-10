// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReferralDashboard from '../ReferralDashboard';

const baseProps = {
  referralCode: 'ALICE123',
  stats: { sent: 0, enrolled: 0, rewardsEarned: 0 },
  referrals: [],
};

describe('ReferralDashboard empty, loading, and error states (#205)', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<ReferralDashboard {...baseProps} isLoading />);
    expect(screen.getByTestId('referral-dashboard-loading')).toBeInTheDocument();
  });

  it('renders error state with retry callback when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <ReferralDashboard
        {...baseProps}
        error="Failed to load referral rewards"
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('referral-dashboard-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load referral rewards')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when referrals list is empty', () => {
    render(<ReferralDashboard {...baseProps} />);
    expect(screen.getByTestId('referral-dashboard-empty')).toBeInTheDocument();
    expect(
      screen.getByText(/You haven't earned any referral rewards yet/i)
    ).toBeInTheDocument();
  });
});
