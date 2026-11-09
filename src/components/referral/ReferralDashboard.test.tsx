// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReferralDashboard from './ReferralDashboard';

const defaultStats = {
  sent: 4,
  enrolled: 2,
  rewardsEarned: 50,
};

describe('ReferralDashboard states (#205)', () => {
  it('renders loading state when isLoading is true', () => {
    render(
      <ReferralDashboard
        referralCode="ADA123"
        stats={defaultStats}
        referrals={[]}
        isLoading
      />,
    );

    expect(screen.getByTestId('referral-dashboard-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading referral stats and rewards/i)).toBeInTheDocument();
  });

  it('renders error state and invokes onRetry when the API call fails', () => {
    const onRetry = vi.fn();
    render(
      <ReferralDashboard
        referralCode="ADA123"
        stats={defaultStats}
        referrals={[]}
        error="Referral stats service returned 503."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('referral-dashboard-error')).toBeInTheDocument();
    expect(screen.getByText(/unable to load referral stats/i)).toBeInTheDocument();
    expect(screen.getByText(/referral stats service returned 503/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when user has no referral rewards yet', () => {
    render(
      <ReferralDashboard
        referralCode="ADA123"
        stats={{ sent: 0, enrolled: 0, rewardsEarned: 0 }}
        referrals={[]}
      />,
    );

    expect(screen.getByTestId('referral-dashboard-empty')).toBeInTheDocument();
    expect(screen.getByText(/no referrals yet/i)).toBeInTheDocument();
  });

  it('renders populated referral stats and rewards table', () => {
    render(
      <ReferralDashboard
        referralCode="ADA123"
        stats={defaultStats}
        referrals={[
          {
            id: 'ref-1',
            friendName: 'Kofi Mensah',
            courseName: 'Soroban Mastery',
            rewardAmount: 25,
            payoutStatus: 'PAID',
          },
        ]}
      />,
    );

    expect(screen.getByText('Kofi Mensah')).toBeInTheDocument();
    expect(screen.getByText('Soroban Mastery')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });
});
