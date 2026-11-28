import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from './TopBar';

const mockAuthState = {
  isConnected: false,
  user: null as { name?: string } | null,
  address: null as string | null,
};

vi.mock('@/lib/hooks/use-auth-store', () => ({
  useAuthStore: () => mockAuthState,
}));

const mockList = vi.fn();
vi.mock('@/lib/api/services', () => ({
  notificationsApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('@/components/layout/ThemeToggle', () => ({
  default: () => <button type="button">Theme</button>,
}));

vi.mock('@/lib/utils', () => ({
  shortAddress: (value: string) => (value ? `${value.slice(0, 4)}...${value.slice(-4)}` : ''),
}));

function setAuth(state: Partial<typeof mockAuthState>) {
  mockAuthState.isConnected = state.isConnected ?? false;
  mockAuthState.user = state.user ?? null;
  mockAuthState.address = state.address ?? null;
}

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({});
    mockList.mockResolvedValue({ data: [] });
  });

  it('renders the brand and login/signup links when disconnected', () => {
    render(<TopBar />);

    expect(screen.getByText('SorobanLard')).toBeInTheDocument();
    expect(screen.getAllByText('Login').length).toBeGreaterThan(0);
    expect(screen.getByText('Signup')).toBeInTheDocument();
  });

  it('shows the empty notification state (no badge) when there are no unread items', async () => {
    setAuth({ isConnected: true, user: { name: 'Ada' }, address: '0x1234567890' });
    mockList.mockResolvedValue({ data: [] });

    render(<TopBar />);

    await waitFor(() => expect(mockList).toHaveBeenCalledWith({ unreadOnly: true }));
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    expect(screen.queryByText('9+')).not.toBeInTheDocument();
  });

  it('shows the populated notification badge and user avatar when connected', async () => {
    setAuth({ isConnected: true, user: { name: 'Ada' }, address: '0x1234567890' });
    mockList.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });

    render(<TopBar />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('caps the notification badge at 9+', async () => {
    setAuth({ isConnected: true, user: { name: 'Ada' }, address: '0x1234567890' });
    mockList.mockResolvedValue({ data: Array.from({ length: 12 }, (_, i) => ({ id: i })) });

    render(<TopBar />);

    await waitFor(() => expect(screen.getByText('9+')).toBeInTheDocument());
  });

  it('falls back to zero notifications when the API fails', async () => {
    setAuth({ isConnected: true, user: { name: 'Ada' }, address: '0x1234567890' });
    mockList.mockRejectedValue(new Error('boom'));

    render(<TopBar />);

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.queryByText('9+')).not.toBeInTheDocument();
  });

  it('toggles the categories dropdown on click', () => {
    render(<TopBar />);

    const categoriesButton = screen.getByRole('button', { name: /categories/i });
    expect(categoriesButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(categoriesButton);
    expect(categoriesButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Creative Arts')).toBeInTheDocument();
    expect(screen.getByText('Photography')).toBeInTheDocument();

    fireEvent.click(categoriesButton);
    expect(categoriesButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Creative Arts')).not.toBeInTheDocument();
  });

  it('updates the search input value as the user types', () => {
    render(<TopBar />);

    const input = screen.getByPlaceholderText('Search for courses, skills, and instructors');
    fireEvent.change(input, { target: { value: 'tailoring' } });
    expect(input).toHaveValue('tailoring');
  });

  it('opens and closes the mobile menu', () => {
    render(<TopBar />);

    const openButton = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(openButton);

    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search courses')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByPlaceholderText('Search courses')).not.toBeInTheDocument();
  });
});
