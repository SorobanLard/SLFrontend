// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserAddress, isFreighterInstalled } from '@/lib/stellar/freighter';
import { useAuthStore, WALLET_ACCOUNT_SWITCHED_MESSAGE } from './use-auth-store';

vi.mock('@/lib/stellar/freighter', () => ({
  isFreighterInstalled: vi.fn(),
  getUserAddress: vi.fn(),
}));

describe('useAuthStore rehydrate and mid-session wallet switch detection', () => {
  const isFreighterInstalledMock = vi.mocked(isFreighterInstalled);
  const getUserAddressMock = vi.mocked(getUserAddress);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = 'sorobanlard_token=; path=/; max-age=0';
    useAuthStore.setState({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      accountSwitched: false,
      detectedWalletAddress: null,
      walletMismatchMessage: null,
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

  it('detects when the user switches accounts in Freighter mid-session and invalidates stale session state (Issue #212)', async () => {
    const originalWallet = 'GAAAA11111111111111111111111111111111111111111111111ORIG';
    const switchedWallet = 'GBBBB22222222222222222222222222222222222222222222222NEWW';

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth(originalWallet, 'jwt-token-orig', {
        id: 'u-1',
        stellarAddress: originalWallet,
      } as any);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe(originalWallet);

    // Simulate user switching account in Freighter extension while logged in
    isFreighterInstalledMock.mockResolvedValueOnce(true);
    getUserAddressMock.mockResolvedValueOnce(switchedWallet);

    let sessionValid = true;
    await act(async () => {
      sessionValid = await result.current.verifyWalletSession();
    });

    expect(sessionValid).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.address).toBeNull();
    expect(result.current.accountSwitched).toBe(true);
    expect(result.current.detectedWalletAddress).toBe(switchedWallet);
    expect(result.current.walletMismatchMessage).toContain(WALLET_ACCOUNT_SWITCHED_MESSAGE);
    expect(localStorage.getItem('sorobanlard_token')).toBeNull();
    expect(localStorage.getItem('sorobanlard_address')).toBeNull();

    // Confirm user can recover by re-authenticating with the new wallet account
    act(() => {
      result.current.setAuth(switchedWallet, 'jwt-token-new', {
        id: 'u-2',
        stellarAddress: switchedWallet,
      } as any);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe(switchedWallet);
    expect(result.current.accountSwitched).toBe(false);
    expect(result.current.walletMismatchMessage).toBeNull();
  });

  it('keeps the session active when Freighter reports the same wallet address', async () => {
    const activeWallet = 'GAAAA11111111111111111111111111111111111111111111111SAME';
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth(activeWallet, 'jwt-token-same', {
        id: 'u-1',
        stellarAddress: activeWallet,
      } as any);
    });

    isFreighterInstalledMock.mockResolvedValueOnce(true);
    getUserAddressMock.mockResolvedValueOnce(activeWallet);

    let sessionValid = false;
    await act(async () => {
      sessionValid = await result.current.verifyWalletSession();
    });

    expect(sessionValid).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.accountSwitched).toBe(false);
    expect(result.current.walletMismatchMessage).toBeNull();
  });
});
