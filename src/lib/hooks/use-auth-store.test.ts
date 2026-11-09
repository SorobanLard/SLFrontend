// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as freighter from '@/lib/stellar/freighter';
import { useAuthStore, WALLET_DISCONNECTED_MESSAGE } from './use-auth-store';

vi.mock('@/lib/stellar/freighter', () => ({
  connectFreighter: vi.fn(),
  getFreighterErrorMessage: vi.fn(
    (err: unknown, fallback = 'Failed to reconnect Freighter wallet. Please try again.') =>
      err instanceof Error ? err.message : fallback,
  ),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = 'sorobanlard_token=; path=/; max-age=0';
    useAuthStore.setState({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      walletDisconnected: false,
      walletDisconnectMessage: null,
    });
  });

  it('clears stale auth state when the server cookie has expired', () => {
    const staleToken = 'stale-token';
    localStorage.setItem('sorobanlard_token', staleToken);
    localStorage.setItem('sorobanlard_address', 'GTEST123');

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.rehydrate();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.address).toBeNull();
    expect(localStorage.getItem('sorobanlard_token')).toBeNull();
    expect(localStorage.getItem('sorobanlard_address')).toBeNull();
  });

  it('disconnects the wallet from an active session and exposes recovery messaging (#209)', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('GACTIVE1111111111111111111111111111111111111111111111111', 'jwt-token', {
        id: 'user-1',
        email: 'learner@sorobanlard.com',
        name: 'Ada',
        role: 'STUDENT',
        walletAddress: 'GACTIVE1111111111111111111111111111111111111111111111111',
      });
    });

    act(() => {
      result.current.disconnectWallet();
    });

    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.walletDisconnected).toBe(true);
    expect(result.current.walletDisconnectMessage).toBe(WALLET_DISCONNECTED_MESSAGE);
    expect(localStorage.getItem('sorobanlard_address')).toBeNull();
    expect(result.current.user?.walletAddress).toBeNull();
  });

  it('allows reconnecting the wallet via Freighter after disconnecting (#209)', async () => {
    const mockedConnect = vi.mocked(freighter.connectFreighter);
    mockedConnect.mockResolvedValueOnce('GRECONNECTED222222222222222222222222222222222222222222');

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('GACTIVE1111111111111111111111111111111111111111111111111', 'jwt-token', {
        id: 'user-1',
        email: 'learner@sorobanlard.com',
        name: 'Ada',
        role: 'STUDENT',
        walletAddress: 'GACTIVE1111111111111111111111111111111111111111111111111',
      });
      result.current.disconnectWallet();
    });

    let reconnected: string | null = null;
    await act(async () => {
      reconnected = await result.current.reconnectWallet();
    });

    expect(reconnected).toBe('GRECONNECTED222222222222222222222222222222222222222222');
    expect(result.current.address).toBe('GRECONNECTED222222222222222222222222222222222222222222');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.walletDisconnected).toBe(false);
    expect(result.current.walletDisconnectMessage).toBeNull();
  });

  it('keeps recovery state and surfaces an actionable message if Freighter reconnect fails (#209)', async () => {
    const mockedConnect = vi.mocked(freighter.connectFreighter);
    mockedConnect.mockRejectedValueOnce(new Error('User declined access'));

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.disconnectWallet();
    });

    await act(async () => {
      const addr = await result.current.reconnectWallet();
      expect(addr).toBeNull();
    });

    expect(result.current.walletDisconnected).toBe(true);
    expect(result.current.walletDisconnectMessage).toContain('User declined access');
  });
});
