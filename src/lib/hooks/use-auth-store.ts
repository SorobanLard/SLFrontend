import { create } from 'zustand';
import type { User } from '@/types';
import { usersApi } from '@/lib/api/services';
import { connectFreighter, getFreighterErrorMessage } from '@/lib/stellar/freighter';

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

export const WALLET_DISCONNECTED_MESSAGE =
  'Wallet disconnected from this session. Reconnect Freighter to sign transactions or continue using wallet features.';

interface AuthState {
  address: string | null;
  token: string | null;
  user: User | null;
  isConnected: boolean;
  walletDisconnected: boolean;
  walletDisconnectMessage: string | null;
  setAuth: (address: string, token: string, user: User, rememberMe?: boolean) => void;
  setAddress: (address: string) => void;
  updateUser: (patch: Partial<User>) => void;
  deleteAccount: (password: string) => Promise<void>;
  disconnectWallet: () => void;
  reconnectWallet: (address?: string) => Promise<string | null>;
  logout: () => void;
  rehydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  address: null,
  token: null,
  user: null,
  isConnected: false,
  walletDisconnected: false,
  walletDisconnectMessage: null,

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
      walletDisconnected: false,
      walletDisconnectMessage: null,
    });
  },

  setAddress: (address) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_ADDRESS_KEY, address);
    }
    set({
      address,
      isConnected: true,
      walletDisconnected: false,
      walletDisconnectMessage: null,
    });
  },

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
      walletDisconnected: false,
      walletDisconnectMessage: null,
    });
  },

  disconnectWallet: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_ADDRESS_KEY);
    }
    const currentUser = get().user;
    set({
      address: null,
      isConnected: false,
      user: currentUser ? { ...currentUser, walletAddress: null } : null,
      walletDisconnected: true,
      walletDisconnectMessage: WALLET_DISCONNECTED_MESSAGE,
    });
  },

  reconnectWallet: async (explicitAddress?: string) => {
    try {
      const nextAddress = explicitAddress ?? (await connectFreighter());
      if (!nextAddress) {
        set({
          walletDisconnected: true,
          walletDisconnectMessage:
            'Could not connect to Freighter. Unlock your wallet and try reconnecting again.',
        });
        return null;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_ADDRESS_KEY, nextAddress);
      }

      const currentUser = get().user;
      set({
        address: nextAddress,
        isConnected: true,
        user: currentUser ? { ...currentUser, walletAddress: nextAddress } : currentUser,
        walletDisconnected: false,
        walletDisconnectMessage: null,
      });
      return nextAddress;
    } catch (err) {
      set({
        walletDisconnected: true,
        walletDisconnectMessage: getFreighterErrorMessage(
          err,
          'Failed to reconnect Freighter wallet. Please try again.',
        ),
      });
      return null;
    }
  },

  logout: () => {
    clearPersistedAuth();
    set({
      address: null,
      token: null,
      user: null,
      isConnected: false,
      walletDisconnected: false,
      walletDisconnectMessage: null,
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
        walletDisconnected: false,
        walletDisconnectMessage: null,
      });
      return;
    }

    set({
      token: storageToken,
      address,
      isConnected: true,
      walletDisconnected: false,
      walletDisconnectMessage: null,
    });
  },
}));
