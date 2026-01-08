import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, setTokens, clearTokens, getAccessToken } from '@/services/api';
import { socketManager } from '@/services/socket';
import { useAuthStore } from '@/store';
import type { LoginDto, RegisterDto, AuthResponse } from '@/types';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

// Get current user
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!getAccessToken(),
  });
};

// Login mutation
export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
    onSuccess: (response: AuthResponse) => {
      // Store tokens
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);

      // Update auth store
      setAuthenticated(true);

      // Update user in cache
      queryClient.setQueryData(authKeys.me(), response.user);

      // Connect socket
      socketManager.connect(response.tokens.accessToken);

      // Navigate to dashboard
      navigate('/dashboard');
    },
  });
};

// Register mutation
export const useRegister = () => {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: (response: AuthResponse) => {
      // Store tokens
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);

      // Update auth store
      setAuthenticated(true);

      // Connect socket
      socketManager.connect(response.tokens.accessToken);

      // Navigate to dashboard
      navigate('/dashboard');
    },
  });
};

// Logout mutation
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      // Clear tokens
      clearTokens();

      // Update auth store
      setAuthenticated(false);

      // Disconnect socket
      socketManager.disconnect();

      // Clear all queries
      queryClient.clear();

      // Navigate to login
      navigate('/login');
    },
  });
};

// Logout from all devices
export const useLogoutAll = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSettled: () => {
      clearTokens();
      setAuthenticated(false);
      socketManager.disconnect();
      queryClient.clear();
      navigate('/login');
    },
  });
};

// Check if user is authenticated
export const useIsAuthenticated = (): boolean => {
  const { data: user, isLoading } = useCurrentUser();
  return !isLoading && !!user;
};

// Get user role
export const useUserRole = (): 'STUDENT' | 'TEACHER' | null => {
  const { data: user } = useCurrentUser();
  return user?.role ?? null;
};

// Check if user is teacher
export const useIsTeacher = (): boolean => {
  const role = useUserRole();
  return role === 'TEACHER';
};

// Auth state hook (combines user data and loading state)
export const useAuth = () => {
  const { data: user, isLoading, error, refetch } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    error,
    refetch,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
};
