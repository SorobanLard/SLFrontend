import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';
import { authApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { connectFreighter, isFreighterInstalled, signNonce } from '@/lib/stellar/freighter';

const mockPush = vi.fn();
const mockGetSearchParam = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api/services', () => ({
  authApi: {
    loginWithEmail: vi.fn(),
  },
}));

vi.mock('@/lib/stellar/freighter', () => ({
  isFreighterInstalled: vi.fn(),
  connectFreighter: vi.fn(),
  signNonce: vi.fn(),
}));

describe('LoginPage integration', () => {
  const loginWithEmailMock = vi.mocked(authApi.loginWithEmail);
  const isFreighterInstalledMock = vi.mocked(isFreighterInstalled);
  const connectFreighterMock = vi.mocked(connectFreighter);
  const signNonceMock = vi.mocked(signNonce);

  beforeEach(() => {
    mockPush.mockReset();
    mockGetSearchParam.mockReset();
    mockGetSearchParam.mockReturnValue(null);
    loginWithEmailMock.mockReset();
    isFreighterInstalledMock.mockReset();
    connectFreighterMock.mockReset();
    signNonceMock.mockReset();
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it('shows validation errors for both fields when the form is submitted empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(await screen.findByText('Password is required.')).toBeInTheDocument();
    expect(loginWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows an email validation error for invalid email formats', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('shows a password validation error for short passwords', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'student@example.com');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });

  it('submits valid credentials and redirects to the dashboard', async () => {
    const user = userEvent.setup();
    loginWithEmailMock.mockResolvedValue({
      accessToken: 'token-123',
      user: { id: 'user-1', email: 'student@example.com' },
    } as any);
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'student@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(loginWithEmailMock).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    expect(localStorage.getItem('sorobanlard_token')).toBe('token-123');
  });

  it('shows an inline error message when the API rejects with invalid credentials', async () => {
    const user = userEvent.setup();
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 401,
        data: { message: 'Invalid credentials' },
        statusText: 'Unauthorized',
        headers: {},
        config: {},
      } as any,
    );
    loginWithEmailMock.mockRejectedValue(error);
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'student@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows a friendly fallback with install link and retry button when Freighter is not installed, and recovers on retry', async () => {
    const user = userEvent.setup();
    isFreighterInstalledMock.mockResolvedValueOnce(false);
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /connect with freighter/i }));

    const fallback = await screen.findByTestId('freighter-not-installed');
    expect(fallback).toHaveTextContent(/freighter extension not installed/i);

    const installLink = screen.getByRole('link', { name: /install freighter/i });
    expect(installLink).toHaveAttribute('href', 'https://www.freighter.app/');
    expect(installLink).toHaveAttribute('target', '_blank');
    expect(connectFreighterMock).not.toHaveBeenCalled();

    isFreighterInstalledMock.mockResolvedValueOnce(true);
    connectFreighterMock.mockResolvedValueOnce('GABCDEFGHIJKLMNOPQRSTUVWXYZ2345672345672345672345672345');

    await user.click(screen.getByRole('button', { name: /^retry$/i }));

    await waitFor(() => {
      expect(connectFreighterMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.queryByTestId('freighter-not-installed')).not.toBeInTheDocument();
  });
});
