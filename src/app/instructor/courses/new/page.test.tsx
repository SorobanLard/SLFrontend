// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewCoursePage, { classifyRegistrationTxError } from './page';

const mockCreate = vi.fn();
const mockSubmitForReview = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api/services', () => ({
  coursesApi: {
    create: (...args: unknown[]) => mockCreate(...args),
    submitForReview: (...args: unknown[]) => mockSubmitForReview(...args),
  },
  uploadsApi: {
    uploadImage: vi.fn(),
    uploadVideo: vi.fn(),
  },
  lessonsApi: {
    createModule: vi.fn(),
    createLesson: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/use-auth-store', () => ({
  useAuthStore: () => ({ address: 'GINSTRUCTOR1234567890' }),
}));

describe('NewCoursePage transaction failure UX (#208)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.scrollTo = vi.fn();
    mockCreate.mockResolvedValue({ id: 'course-101' });
  });

  it('classifies user rejected, wallet unavailable, network, and on-chain errors accurately', () => {
    expect(classifyRegistrationTxError(new Error('User declined transaction signature')).kind).toBe(
      'user_rejected'
    );
    expect(classifyRegistrationTxError(new Error('Freighter wallet not installed')).kind).toBe(
      'wallet_unavailable'
    );
    expect(classifyRegistrationTxError(new Error('Horizon RPC network timeout')).kind).toBe(
      'network_error'
    );
    expect(classifyRegistrationTxError(new Error('Transaction simulation failed: tx_failed')).kind).toBe(
      'onchain_failure'
    );
  });

  it('displays actionable failure state and allows retrying registration without losing draft state', async () => {
    mockSubmitForReview
      .mockRejectedValueOnce(new Error('Transaction simulation failed: tx_failed on-chain'))
      .mockResolvedValueOnce({});

    render(<NewCoursePage />);

    // Step 1
    fireEvent.change(screen.getByLabelText(/Course title/i), {
      target: { value: 'Professional Tailoring' },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: 'Tailoring' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Step 2 -> 3 -> 4
    await waitFor(() => expect(screen.getByText('Section 1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => expect(screen.getByText('Upload course thumbnail')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Step 4 Pricing -> set Free and Next
    await waitFor(() => expect(screen.getByText('No payment required to enrol')).toBeInTheDocument());
    fireEvent.click(screen.getByText('No payment required to enrol'));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // Step 5 Review -> Submit
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Submit for review/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Submit for review/i }));

    await waitFor(() => {
      expect(screen.getByTestId('tx-failure-banner')).toBeInTheDocument();
    });

    const banner = screen.getByTestId('tx-failure-banner');
    expect(banner).toHaveAttribute('data-error-kind', 'onchain_failure');
    expect(screen.getByText('On-Chain Course Registration Failed')).toBeInTheDocument();
    expect(localStorage.getItem('sorobanlard_course_draft')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Retry On-Chain Registration/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/instructor');
    });
  });
});
