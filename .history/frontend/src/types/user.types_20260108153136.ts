export type UserRole = 'STUDENT' | 'TEACHER';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
