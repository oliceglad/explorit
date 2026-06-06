import { create } from 'zustand';
import { getItemAsync, setItemAsync, deleteItemAsync } from '@/utils/storage';
import { authApi } from '@/services/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
  interests: string[];
  is_active: boolean;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isHydrated: false,
 

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(email, password);
      await setItemAsync('access_token', data.access_token);
      await setItemAsync('refresh_token', data.refresh_token);
      const { data: user } = await authApi.me();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, nickname, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register(email, nickname, password);
      await setItemAsync('access_token', data.access_token);
      await setItemAsync('refresh_token', data.refresh_token);
      const { data: user } = await authApi.me();
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await deleteItemAsync('access_token');
    await deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await getItemAsync('access_token');
      if (!token) return;
      try {
        const { data: user } = await authApi.me();
        set({ user, isAuthenticated: true });
      } catch {
        await deleteItemAsync('access_token');
        await deleteItemAsync('refresh_token');
      }
    } finally {
      set({ isHydrated: true });
    }
  },
}));
