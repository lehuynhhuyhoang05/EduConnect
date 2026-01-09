import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store';
import { User, LoginCredentials, RegisterData } from '../types';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

// Login mutation
export function useLogin() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/login',
        credentials
      );
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(authKeys.profile(), data.user);
    },
  });
}

// Register mutation
export function useRegister() {
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/register',
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.setQueryData(authKeys.profile(), data.user);
    },
  });
}

// Logout mutation
export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
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
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: async () => {
      const response = await api.get<User>('/auth/profile');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.patch<User>('/auth/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data);
      queryClient.setQueryData(authKeys.profile(), data);
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
      const response = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken }
      );
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
