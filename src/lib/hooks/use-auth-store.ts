import { create } from 'zustand';
import type { User } from '@/types';
import { usersApi } from '@/lib/api/services';
import { getUserAddress, isFreighterInstalled } from '@/lib/stellar/freighter';

const AUTH_TOKEN_KEY = 'sorobanlard_token';
const AUTH_ADDRESS_KEY = 'sorobanlard_address';

export const WALLET_ACCOUNT_SWITCHED_MESSAGE =
  'Your active Freighter wallet account changed mid-session. Please re-authenticate with the selected wallet or switch back to your original account in Freighter.';

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

const formatShortWallet = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 5)}...${addr.slice(-4)}` : addr;

interface AuthState {
  address:     string | null;
  token:       string | null;
  user:        User | null;
  isConnected: boolean;
  accountSwitched: boolean;
  detectedWalletAddress: string | null;
  walletMismatchMessage: string | null;
  setAuth:     (address: string, token: string, user: User, rememberMe?: boolean) => void;
  setAddress:  (address: string) => void;
  updateUser:  (patch: Partial<User>) => void;
  deleteAccount: (password: string) => Promise<void>;
  logout:      () => void;
  rehydrate:   () => void;
  verifyWalletSession: () => Promise<boolean>;
  dismissWalletMismatch: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  address: null,
  token: null,
  user: null,
  isConnected: false,
  accountSwitched: false,
  detectedWalletAddress: null,
  walletMismatchMessage: null,

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
      accountSwitched: false,
      detectedWalletAddress: null,
      walletMismatchMessage: null,
    });
  },

  setAddress: (address) =>
    set({
      address,
      isConnected: true,
      accountSwitched: false,
      detectedWalletAddress: null,
      walletMismatchMessage: null,
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
      accountSwitched: false,
      detectedWalletAddress: null,
      walletMismatchMessage: null,
    });
  },

  logout: () => {
    clearPersistedAuth();
    set({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      accountSwitched: false,
      detectedWalletAddress: null,
      walletMismatchMessage: null,
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
        accountSwitched: false,
        detectedWalletAddress: null,
        walletMismatchMessage: null,
      });
      return;
    }

    set({ token: storageToken, address, isConnected: true });
  },

  verifyWalletSession: async () => {
    const state = get();
    if (!state.address || !state.isConnected) {
      return false;
    }

    try {
      const installed = await isFreighterInstalled();
      if (!installed) {
        return true;
      }

      const activeAddress = (await getUserAddress())?.trim();
      if (!activeAddress) {
        return true;
      }

      if (activeAddress !== state.address) {
        clearPersistedAuth();
        set({
          address: null,
          token: null,
          user: null,
          isConnected: false,
          accountSwitched: true,
          detectedWalletAddress: activeAddress,
          walletMismatchMessage: `${WALLET_ACCOUNT_SWITCHED_MESSAGE} (Session: ${formatShortWallet(
            state.address,
          )}, Freighter: ${formatShortWallet(activeAddress)})`,
        });
        return false;
      }

      if (state.accountSwitched || state.walletMismatchMessage) {
        set({
          accountSwitched: false,
          detectedWalletAddress: null,
          walletMismatchMessage: null,
        });
      }
      return true;
    } catch {
      return true;
    }
  },

  dismissWalletMismatch: () =>
    set({
      accountSwitched: false,
      detectedWalletAddress: null,
      walletMismatchMessage: null,
    }),
}));
