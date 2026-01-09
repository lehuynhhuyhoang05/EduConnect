import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import type { RegisterDto, LoginDto } from '@/types/auth.types';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    setAuth,
    setUser,
    logout: clearAuth,
  } = useAuthStore();

  // Get current user
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated && !user,
    staleTime: 5 * 60 * 1000,
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: (response) => {
      setAuth(response.user, response.tokens);
      toast.success('Đăng ký thành công!');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng ký thất bại');
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
    onSuccess: (response) => {
      setAuth(response.user, response.tokens);
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng nhập thất bại');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      if (tokens?.refreshToken) {
        return authApi.logout(tokens.refreshToken);
      }
      return Promise.resolve();
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });

  return {
    user: user || currentUser,
    tokens,
    isAuthenticated,
    isLoading: isLoading || isLoadingUser,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
