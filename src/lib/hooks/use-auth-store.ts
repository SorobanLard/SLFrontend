import { create } from 'zustand';
import type { User } from '@/types';
import { usersApi } from '@/lib/api/services';
import { connectFreighter, getUserAddress } from '@/lib/stellar/freighter';

const AUTH_TOKEN_KEY = 'sorobanlard_token';
const AUTH_ADDRESS_KEY = 'sorobanlard_address';

const readCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

const clearPersistedAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ADDRESS_KEY);
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0`;
};

export interface AccountSwitchCheckResult {
  switched: boolean;
  previousAddress: string | null;
  activeAddress: string | null;
  message: string | null;
}

interface AuthState {
  address:               string | null;
  token:                 string | null;
  user:                  User | null;
  isConnected:           boolean;
  accountSwitchDetected: boolean;
  switchedToAddress:     string | null;
  accountSwitchMessage:  string | null;
  setAuth:               (address: string, token: string, user: User, rememberMe?: boolean) => void;
  setAddress:            (address: string) => void;
  updateUser:            (patch: Partial<User>) => void;
  deleteAccount:         (password: string) => Promise<void>;
  logout:                () => void;
  rehydrate:             () => void;
  verifyActiveWalletAddress: () => Promise<AccountSwitchCheckResult>;
  reauthenticateWallet:  () => Promise<string>;
  dismissAccountSwitch:  () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  address: null,
  token: null,
  user: null,
  isConnected: false,
  accountSwitchDetected: false,
  switchedToAddress: null,
  accountSwitchMessage: null,

  setAuth: (address, token, user, rememberMe = false) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_ADDRESS_KEY, address);
      const maxAge = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
      document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    set({
      address,
      token,
      user,
      isConnected: true,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
    });
  },

  setAddress: (address) =>
    set({
      address,
      isConnected: true,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
    }),

  updateUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),

  deleteAccount: async (password) => {
    await usersApi.deleteAccount(password);
    clearPersistedAuth();
    set({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
    });
  },

  logout: () => {
    clearPersistedAuth();
    set({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
    });
  },

  rehydrate: () => {
    if (typeof window === 'undefined') return;

    const cookieToken = readCookie(AUTH_TOKEN_KEY);
    const storageToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const address = localStorage.getItem(AUTH_ADDRESS_KEY);

    if (!cookieToken || !storageToken || !address || cookieToken !== storageToken) {
      if (storageToken || address) {
        clearPersistedAuth();
      }
      set({
        address: null,
        token: null,
        user: null,
        isConnected: false,
        accountSwitchDetected: false,
        switchedToAddress: null,
        accountSwitchMessage: null,
      });
      return;
    }

    set({ token: storageToken, address, isConnected: true });
  },

  verifyActiveWalletAddress: async () => {
    const { address, user, isConnected, accountSwitchDetected } = get();
    const expectedAddress =
      user?.stellarAddress ?? (address && !address.includes('@') ? address : null);

    if (!expectedAddress || (!isConnected && !accountSwitchDetected)) {
      return {
        switched: false,
        previousAddress: expectedAddress,
        activeAddress: null,
        message: null,
      };
    }

    try {
      const rawActive = await getUserAddress();
      const activeAddress = rawActive?.trim() || null;

      if (!activeAddress) {
        return {
          switched: false,
          previousAddress: expectedAddress,
          activeAddress: null,
          message: null,
        };
      }

      if (activeAddress !== expectedAddress) {
        const message = `Wallet account switched in Freighter to ${activeAddress}. Please re-authenticate with the new account or switch back to ${expectedAddress} in Freighter.`;
        set({
          accountSwitchDetected: true,
          switchedToAddress: activeAddress,
          accountSwitchMessage: message,
          isConnected: false,
        });
        return {
          switched: true,
          previousAddress: expectedAddress,
          activeAddress,
          message,
        };
      }

      if (accountSwitchDetected) {
        set({
          accountSwitchDetected: false,
          switchedToAddress: null,
          accountSwitchMessage: null,
          isConnected: true,
        });
      }

      return {
        switched: false,
        previousAddress: expectedAddress,
        activeAddress,
        message: null,
      };
    } catch {
      return {
        switched: false,
        previousAddress: expectedAddress,
        activeAddress: null,
        message: null,
      };
    }
  },

  reauthenticateWallet: async () => {
    const nextAddress = (await connectFreighter()).trim();
    clearPersistedAuth();
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_ADDRESS_KEY, nextAddress);
    }
    set({
      address: nextAddress,
      token: null,
      user: null,
      isConnected: true,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
    });
    return nextAddress;
  },

  dismissAccountSwitch: () => {
    clearPersistedAuth();
    set({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      accountSwitchDetected: false,
      switchedToAddress: null,
      accountSwitchMessage: null,
    });
  },
}));

/**
 * Subscribes to window focus and visibility changes to detect mid-session
 * Freighter account switches when the user returns from the extension popup.
 */
export function subscribeToWalletAccountChanges(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCheck = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void useAuthStore.getState().verifyActiveWalletAddress();
  };

  window.addEventListener('focus', handleCheck);
  document.addEventListener('visibilitychange', handleCheck);

  return () => {
    window.removeEventListener('focus', handleCheck);
    document.removeEventListener('visibilitychange', handleCheck);
  };
}
