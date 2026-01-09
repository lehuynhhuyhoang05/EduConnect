import type { User, UserRole } from './user.types';

// Auth DTOs
export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}

// Auth Responses
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Auth State
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
