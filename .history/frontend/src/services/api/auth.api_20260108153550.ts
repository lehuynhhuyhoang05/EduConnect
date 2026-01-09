import api from './axios';
import type {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  AuthResponse,
  RefreshResponse,
  User,
} from '@/types';

/**
 * Register a new user
 */
export async function register(data: RegisterDto): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
}

/**
 * Login with email and password
 */
export async function login(data: LoginDto): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
}

/**
 * Refresh access token
 */
export async function refreshToken(data: RefreshTokenDto): Promise<RefreshResponse> {
  const response = await api.post<RefreshResponse>('/auth/refresh', data);
  return response.data;
}

/**
 * Logout and revoke refresh token
 */
export async function logout(data: LogoutDto): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/logout', data);
  return response.data;
}

/**
 * Logout from all devices
 */
export async function logoutAll(): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/logout-all');
  return response.data;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}
