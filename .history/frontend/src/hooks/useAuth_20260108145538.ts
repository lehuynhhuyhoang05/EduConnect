import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store';
import type { User } from '../types';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

// Backend response types
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

// Login mutation
export function useLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      // Map user data to store format
      const user = {
        ...data.user,
        name: data.user.fullName,
        avatar: data.user.avatarUrl || undefined,
      };
      setAuth(user as any, data.tokens.accessToken, data.tokens.refreshToken);
      queryClient.setQueryData(authKeys.profile(), user);
    },
  });
}

// Register mutation
export function useRegister() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; role?: string }) => {
      const response = await api.post<RegisterResponse>('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      const user = {
        ...data.user,
        name: data.user.fullName,
        avatar: data.user.avatarUrl || undefined,
      };
      setAuth(user as any, data.tokens.accessToken, data.tokens.refreshToken);
      queryClient.setQueryData(authKeys.profile(), user);
    },
  });
}

// Logout mutation
export function useLogout() {
  const { logout, refreshToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        if (refreshToken) {
          await api.post('/auth/logout', { refreshToken });
        }
      } catch (error) {
        // Ignore logout errors
      }
    },
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

// Get current user profile
export function useProfile() {
  const { isAuthenticated, setUser } = useAuthStore();

  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: async () => {
      const response = await api.get<User>('/auth/me');
      const user = {
        ...response.data,
        name: response.data.fullName,
        avatar: response.data.avatarUrl || undefined,
      };
      setUser(user as any);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { fullName?: string; avatarUrl?: string }) => {
      const response = await api.patch<User>('/auth/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      const user = {
        ...data,
        name: data.fullName,
        avatar: data.avatarUrl || undefined,
      };
      setUser(user as any);
      queryClient.setQueryData(authKeys.profile(), user);
    },
  });
}

// Change password mutation
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await api.post('/auth/change-password', data);
      return response.data;
    },
  });
}

// Refresh token mutation
export function useRefreshToken() {
  const { refreshToken, setAuth, logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      const response = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
      return response.data;
    },
    onSuccess: (data) => {
      const { user } = useAuthStore.getState();
      if (user) {
        setAuth(user, data.accessToken, data.refreshToken);
      }
    },
    onError: () => {
      logout();
    },
  });
}

// Alias for useProfile - used in dashboard
export const useCurrentUser = useProfile;
