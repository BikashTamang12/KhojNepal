export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserSummary {
  id: string;
  fullName: string;
  isVerified: boolean;
  email?: string;
  phone?: string;
}

export interface UserStats {
  itemsCount: number;
  claimsCount: number;
  unreadNotificationsCount: number;
}

export interface UserProfileWithStats extends User {
  stats: UserStats;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
