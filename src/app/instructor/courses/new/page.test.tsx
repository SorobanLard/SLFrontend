import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewCoursePage, { classifyCourseRegistrationError } from './page';
import { coursesApi, lessonsApi } from '@/lib/api/services';
import { registerCourseOnChain } from '@/lib/stellar/contract';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/services', () => ({
  coursesApi: {
    create: vi.fn(),
    submitForReview: vi.fn(),
  },
  lessonsApi: {
    createModule: vi.fn(),
    createLesson: vi.fn(),
  },
  uploadsApi: {
    upload: vi.fn(),
  },
}));

vi.mock('@/lib/stellar/contract', () => ({
  registerCourseOnChain: vi.fn(),
}));

describe('NewCoursePage Stellar registration failure UX (Issue #208)', () => {
  const createCourseMock = vi.mocked(coursesApi.create);
  const submitForReviewMock = vi.mocked(coursesApi.submitForReview);
  const createModuleMock = vi.mocked(lessonsApi.createModule);
  const createLessonMock = vi.mocked(lessonsApi.createLesson);
  const registerCourseOnChainMock = vi.mocked(registerCourseOnChain);

  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn() as any;
    localStorage.clear();
    useAuthStore.setState({
      address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      token: 'instructor-token',
      user: { id: 'inst-1', email: 'inst@sorobanlard.com', role: 'INSTRUCTOR' } as any,
      isConnected: true,
    });
    createCourseMock.mockResolvedValue({ id: 'c-1' } as any);
    createModuleMock.mockResolvedValue({ id: 'mod-1' } as any);
    createLessonMock.mockResolvedValue({ id: 'les-1' } as any);
    submitForReviewMock.mockResolvedValue({ id: 'c-1', status: 'PENDING' } as any);
  });

  const advanceToReviewStep = async () => {
    render(<NewCoursePage />);

    // Step 1: Basics
    fireEvent.change(screen.getByLabelText(/course title/i), {
      target: { value: 'Bridal Tailoring Masterclass' },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: 'Tailoring' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Curriculum -> Step 3: Media -> Step 4: Pricing
    await waitFor(() => expect(screen.getByRole('heading', { name: /curriculum/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /media/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /pricing/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/price \(usdc\)/i), {
      target: { value: '49.99' },
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument());
  };

  it('classifies rejected signature, on-chain submission failure, and network errors into distinct actionable states', () => {
    const rejected = classifyCourseRegistrationError(new Error('User declined access'));
    expect(rejected.kind).toBe('signature_rejected');
    expect(rejected.title).toMatch(/signature rejected in freighter/i);

    const onChain = classifyCourseRegistrationError(new Error('Transaction failed: abc123'));
    expect(onChain.kind).toBe('onchain_failed');
    expect(onChain.title).toMatch(/on-chain course registration failed/i);

    const net = classifyCourseRegistrationError(new Error('Failed to fetch Soroban RPC'));
    expect(net.kind).toBe('network_error');
    expect(net.title).toMatch(/network connection error/i);
  });

  it('distinguishes rejected signature, on-chain failure, and network error in the UI and recovers on retry', async () => {
    await advanceToReviewStep();

    // 1. User rejects Freighter signing prompt
    registerCourseOnChainMock.mockRejectedValueOnce(new Error('User declined access'));
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }));

    const alert1 = await screen.findByTestId('course-registration-error');
    expect(alert1).toHaveAttribute('data-error-kind', 'signature_rejected');
    expect(alert1).toHaveTextContent(/signature rejected in freighter/i);
    expect(alert1).toHaveTextContent(/retry registration/i);
    expect(submitForReviewMock).not.toHaveBeenCalled();

    // 2. Retry -> On-chain submission fails
    registerCourseOnChainMock.mockRejectedValueOnce(new Error('Submission failed'));
    fireEvent.click(screen.getByRole('button', { name: /retry registration/i }));

    await waitFor(() => {
      expect(screen.getByTestId('course-registration-error')).toHaveAttribute(
        'data-error-kind',
        'onchain_failed',
      );
    });
    expect(screen.getByTestId('course-registration-error')).toHaveTextContent(
      /on-chain course registration failed/i,
    );

    // 3. Retry -> Network error
    registerCourseOnChainMock.mockRejectedValueOnce(new Error('Network request timed out'));
    fireEvent.click(screen.getByRole('button', { name: /retry registration/i }));

    await waitFor(() => {
      expect(screen.getByTestId('course-registration-error')).toHaveAttribute(
        'data-error-kind',
        'network_error',
      );
    });
    expect(screen.getByTestId('course-registration-error')).toHaveTextContent(
      /network connection error/i,
    );

    // 4. Retry -> Succeeds on-chain and submits for review without duplicating course creation
    registerCourseOnChainMock.mockResolvedValueOnce('tx-hash-success-999');
    fireEvent.click(screen.getByRole('button', { name: /retry registration/i }));

    await waitFor(() => {
      expect(submitForReviewMock).toHaveBeenCalledWith(expect.any(String), 'tx-hash-success-999');
      expect(mockPush).toHaveBeenCalledWith('/dashboard/instructor');
    });
    expect(createCourseMock).toHaveBeenCalledTimes(1);
  });
});
