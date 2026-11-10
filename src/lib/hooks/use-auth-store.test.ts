// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectFreighter, getUserAddress } from '@/lib/stellar/freighter';
import { subscribeToWalletAccountChanges, useAuthStore } from './use-auth-store';

vi.mock('@/lib/stellar/freighter', () => ({
  getUserAddress: vi.fn(),
  connectFreighter: vi.fn(),
}));

describe('useAuthStore', () => {
  const getUserAddressMock = vi.mocked(getUserAddress);
  const connectFreighterMock = vi.mocked(connectFreighter);

  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'sorobanlard_token=; path=/; max-age=0';
    getUserAddressMock.mockReset();
    connectFreighterMock.mockReset();
    useAuthStore.setState({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
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

  it('detects when the Freighter account is switched mid-session and recovers when switched back', async () => {
    const originalAddress = 'GACCOUNT_ORIGINAL_1234567890';
    const switchedAddress = 'GACCOUNT_SWITCHED_9876543210';

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth(originalAddress, 'jwt-token-1', {
        id: 'u1',
        name: 'Learner',
        email: 'learner@example.com',
        stellarAddress: originalAddress,
        role: 'STUDENT',
        createdAt: new Date().toISOString(),
      } as any);
    });

    getUserAddressMock.mockResolvedValueOnce(switchedAddress);

    let checkResult: Awaited<ReturnType<typeof result.current.verifyActiveWalletAddress>> | undefined;
    await act(async () => {
      checkResult = await result.current.verifyActiveWalletAddress();
    });

    expect(checkResult?.switched).toBe(true);
    expect(result.current.accountSwitchDetected).toBe(true);
    expect(result.current.switchedToAddress).toBe(switchedAddress);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.accountSwitchMessage).toContain(switchedAddress);
    expect(result.current.accountSwitchMessage).toContain('Please re-authenticate');

    // User switches Freighter back to the original account
    getUserAddressMock.mockResolvedValueOnce(originalAddress);

    await act(async () => {
      checkResult = await result.current.verifyActiveWalletAddress();
    });

    expect(checkResult?.switched).toBe(false);
    expect(result.current.accountSwitchDetected).toBe(false);
    expect(result.current.switchedToAddress).toBeNull();
    expect(result.current.accountSwitchMessage).toBeNull();
    expect(result.current.isConnected).toBe(true);
  });

  it('allows re-authenticating with the newly selected Freighter account after a mid-session switch', async () => {
    const originalAddress = 'GACCOUNT_ORIGINAL_1234567890';
    const switchedAddress = 'GACCOUNT_SWITCHED_9876543210';

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAddress(originalAddress);
    });

    getUserAddressMock.mockResolvedValueOnce(switchedAddress);
    const unsubscribe = subscribeToWalletAccountChanges();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current.accountSwitchDetected).toBe(true);
    expect(result.current.switchedToAddress).toBe(switchedAddress);

    connectFreighterMock.mockResolvedValueOnce(switchedAddress);

    await act(async () => {
      await result.current.reauthenticateWallet();
    });

    expect(connectFreighterMock).toHaveBeenCalledTimes(1);
    expect(result.current.address).toBe(switchedAddress);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.accountSwitchDetected).toBe(false);
    expect(result.current.switchedToAddress).toBeNull();
    expect(result.current.accountSwitchMessage).toBeNull();

    unsubscribe();
  });
});
