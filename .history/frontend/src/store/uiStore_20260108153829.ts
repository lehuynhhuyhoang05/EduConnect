import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/utils/constants';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // Theme
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  
  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  
  // Loading states
  globalLoading: boolean;
  
  // Toast
  toasts: Toast[];
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      toasts: [],
      
      setTheme: (theme) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },
      
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
      
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      
      setSidebarMobileOpen: (open) => {
        set({ sidebarMobileOpen: open });
      },
      
      openModal: (modalId, data = null) => {
        set({ activeModal: modalId, modalData: data });
      },
      
      closeModal: () => {
        set({ activeModal: null, modalData: null });
      },
      
      setGlobalLoading: (loading) => {
        set({ globalLoading: loading });
      },
      
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));
        
        // Auto remove after duration
        const duration = toast.duration || 4000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: STORAGE_KEYS.THEME,
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = state.theme === 'system' ? getSystemTheme() : state.theme;
          applyTheme(resolvedTheme);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useUIStore.getState();
    if (state.theme === 'system') {
      const resolvedTheme = e.matches ? 'dark' : 'light';
      applyTheme(resolvedTheme);
      useUIStore.setState({ resolvedTheme });
    }
  });
}
