import { create } from 'zustand';
import type { User } from '@/types';

const TOKEN_COOKIE_NAME = 'sorobanlard_token';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type WalletConnectionStatus = 'idle' | 'connected' | 'disconnected' | 'error';

export interface DisconnectWalletOptions {
  /** When true, also terminates the authenticated session and clears JWT cookies. */
  endSession?: boolean;
  /** Optional custom user-facing reason (e.g., Freighter locked or account switched). */
  reason?: string;
}

function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + TOKEN_COOKIE_NAME + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

interface AuthState {
  address: string | null;
  token: string | null;
  user: User | null;
  isConnected: boolean;
  walletStatus: WalletConnectionStatus;
  walletDisconnectMessage: string | null;
  setAuth: (address: string, token: string, user?: User) => void;
  setUser: (user: User) => void;
  disconnectWallet: (options?: DisconnectWalletOptions) => void;
  clearWalletDisconnectMessage: () => void;
  logout: () => void;
  rehydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  address: null,
  token: null,
  user: null,
  isConnected: false,
  walletStatus: 'idle',
  walletDisconnectMessage: null,

  setAuth: (address, token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sorobanlard_token', token);
      if (address) {
        localStorage.setItem('sorobanlard_address', address);
      } else {
        localStorage.removeItem('sorobanlard_address');
      }
      if (user) localStorage.setItem('sorobanlard_user', JSON.stringify(user));
    }
    setAuthCookie(token);
    set({
      address: address || null,
      token,
      user: user ?? null,
      isConnected: true,
      walletStatus: address ? 'connected' : 'idle',
      walletDisconnectMessage: null,
    });
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sorobanlard_user', JSON.stringify(user));
    }
    set({ user });
  },

  disconnectWallet: (options) => {
    const current = get();
    const shouldEndSession = options?.endSession ?? !current.user?.email;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('sorobanlard_address');
      if (shouldEndSession) {
        localStorage.removeItem('sorobanlard_token');
        localStorage.removeItem('sorobanlard_user');
      }
    }

    const message =
      options?.reason ??
      (shouldEndSession
        ? 'Wallet disconnected. Your active wallet session has ended.'
        : 'Wallet disconnected from your active session. Reconnect Freighter to sign transactions.');

    if (shouldEndSession) {
      clearAuthCookie();
      set({
        address: null,
        token: null,
        user: null,
        isConnected: false,
        walletStatus: 'disconnected',
        walletDisconnectMessage: message,
      });
      return;
    }

    const updatedUser = current.user
      ? { ...current.user, walletAddress: undefined }
      : null;

    if (typeof window !== 'undefined' && updatedUser) {
      localStorage.setItem('sorobanlard_user', JSON.stringify(updatedUser));
    }

    set({
      address: null,
      user: updatedUser,
      isConnected: Boolean(current.token),
      walletStatus: 'disconnected',
      walletDisconnectMessage: message,
    });
  },

  clearWalletDisconnectMessage: () => {
    set({ walletDisconnectMessage: null });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sorobanlard_token');
      localStorage.removeItem('sorobanlard_address');
      localStorage.removeItem('sorobanlard_user');
    }
    clearAuthCookie();
    set({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      walletStatus: 'disconnected',
      walletDisconnectMessage: null,
    });
  },

  rehydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('sorobanlard_token');
    const cookieToken = getAuthCookie();
    const address = localStorage.getItem('sorobanlard_address');
    const userStr = localStorage.getItem('sorobanlard_user');
    const user = userStr ? (JSON.parse(userStr) as User) : null;

    // Validate local state against cookie presence to avoid stale UI state
    if (token && cookieToken && token === cookieToken) {
      set({
        address,
        token,
        user,
        isConnected: true,
        walletStatus: address ? 'connected' : 'idle',
        walletDisconnectMessage: null,
      });
    } else if (token || address || userStr || cookieToken) {
      // Clear out any inconsistent or stale session data
      get().logout();
    }
  },
}));
