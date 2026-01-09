import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface User {
  id: number | string;
  fullName: string;
  name?: string; // alias
  email: string;
  avatarUrl?: string | null;
  avatar?: string; // alias
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

// Auth Store - works with React Query and API hooks
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      isAuthenticated: !!localStorage.getItem('accessToken'),
      isLoading: false,

      setAuthenticated: (isAuthenticated: boolean) => {
        set({ isAuthenticated });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setAuth: (user: User, accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({
          user: {
            ...user,
            name: user.fullName, // alias
            avatar: user.avatarUrl || undefined, // alias
          },
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Theme Store
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        
        if (theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', isDark);
        } else {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

// UI State Store
interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
