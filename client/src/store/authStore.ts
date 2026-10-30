import { create } from 'zustand';
import { User } from '../types';
import { api, ApiError } from '../api/client';
import { useUiStore } from './uiStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; role?: string }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('devsync_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('devsync_token'),
  isAuthenticated: !!localStorage.getItem('devsync_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await api.post<{ success: boolean; token: string; user: User }>('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('devsync_token', data.token);
      localStorage.setItem('devsync_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });

      useUiStore.getState().addToast({
        type: 'success',
        title: 'Welcome back!',
        message: `Signed in as ${data.user.name}`,
      });

      return true;
    } catch (err: any) {
      set({ isLoading: false });
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Sign In Failed',
        message: err.message || 'Please check your credentials',
      });
      return false;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true });
    try {
      const data = await api.post<{ success: boolean; token: string; user: User }>('/auth/register', registerData);

      localStorage.setItem('devsync_token', data.token);
      localStorage.setItem('devsync_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });

      useUiStore.getState().addToast({
        type: 'success',
        title: 'Account Created',
        message: `Welcome to DevSync, ${data.user.name}!`,
      });

      return true;
    } catch (err: any) {
      set({ isLoading: false });
      useUiStore.getState().addToast({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'Could not create account',
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('devsync_token');
    localStorage.removeItem('devsync_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    useUiStore.getState().addToast({
      type: 'info',
      message: 'Signed out successfully',
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('devsync_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const data = await api.get<{ success: boolean; user: User }>('/auth/me');
      set({ user: data.user, isAuthenticated: true });
      localStorage.setItem('devsync_user', JSON.stringify(data.user));
    } catch {
      localStorage.removeItem('devsync_token');
      localStorage.removeItem('devsync_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateUser: (user) => {
    set({ user });
    localStorage.setItem('devsync_user', JSON.stringify(user));
  },
}));

