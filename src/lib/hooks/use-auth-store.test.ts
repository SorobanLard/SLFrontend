// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './use-auth-store';
import type { User } from '@/types';

const mockUserWithEmail: User = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'STUDENT',
  walletAddress: 'GABC1234567890',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('useAuthStore rehydrate and wallet disconnect UX', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'sorobanlard_token=; path=/; max-age=0';
    useAuthStore.setState({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      walletStatus: 'idle',
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

  it('disconnects wallet from an active email-backed session while preserving session token and surfacing feedback', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('GABC1234567890', 'valid-jwt-token', mockUserWithEmail);
    });

    expect(result.current.walletStatus).toBe('connected');
    expect(result.current.address).toBe('GABC1234567890');

    act(() => {
      result.current.disconnectWallet();
    });

    expect(result.current.address).toBeNull();
    expect(result.current.walletStatus).toBe('disconnected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.token).toBe('valid-jwt-token');
    expect(result.current.user?.walletAddress).toBeUndefined();
    expect(result.current.walletDisconnectMessage).toContain(
      'Wallet disconnected from your active session'
    );
    expect(localStorage.getItem('sorobanlard_address')).toBeNull();
    expect(localStorage.getItem('sorobanlard_token')).toBe('valid-jwt-token');
  });

  it('ends wallet-only session completely when disconnecting wallet or when endSession is true', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('GWALLET_ONLY', 'wallet-jwt-token');
    });

    act(() => {
      result.current.disconnectWallet({
        reason: 'Freighter wallet was locked by the user.',
      });
    });

    expect(result.current.address).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.walletStatus).toBe('disconnected');
    expect(result.current.walletDisconnectMessage).toBe(
      'Freighter wallet was locked by the user.'
    );
    expect(localStorage.getItem('sorobanlard_token')).toBeNull();
    expect(localStorage.getItem('sorobanlard_address')).toBeNull();

    act(() => {
      result.current.clearWalletDisconnectMessage();
    });
    expect(result.current.walletDisconnectMessage).toBeNull();
  });
});
