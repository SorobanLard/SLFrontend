import { create } from 'zustand';
import type { User } from '@/types';
import { usersApi } from '@/lib/api/services';

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

interface AuthState {
  address:     string | null;
  token:       string | null;
  user:        User | null;
  isConnected: boolean;
  setAuth:     (address: string, token: string, user: User, rememberMe?: boolean) => void;
  setAddress:  (address: string) => void;
  updateUser:  (patch: Partial<User>) => void;
  deleteAccount: (password: string) => Promise<void>;
  logout:      () => void;
  rehydrate:   () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  address: null, token: null, user: null, isConnected: false,

  setAuth: (address, token, user, rememberMe = false) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_ADDRESS_KEY, address);
      const maxAge = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
      document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    set({ address, token, user, isConnected: true });
  },

  setAddress: (address) => set({ address, isConnected: true }),

  updateUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),

  deleteAccount: async (password) => {
    await usersApi.deleteAccount(password);
    clearPersistedAuth();
    set({ address: null, token: null, user: null, isConnected: false });
  },

  logout: () => {
    clearPersistedAuth();
    set({ address: null, token: null, user: null, isConnected: false });
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
      set({ address: null, token: null, user: null, isConnected: false });
      return;
    }

    set({ token: storageToken, address, isConnected: true });
  },
}));
