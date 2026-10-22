// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './use-auth-store';

describe('useAuthStore rehydrate', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'sorobanlard_token=; path=/; max-age=0';
    useAuthStore.setState({
      address: null,
      token: null,
      user: null,
      isConnected: false,
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
});
