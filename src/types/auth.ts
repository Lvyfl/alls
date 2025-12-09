export type UserRole = 'admin' | 'teacher';

export interface User {
  _id: string;
  email: string;
  password: string;
  initialPassword?: string;
  passwordBypassApproved?: boolean;
  passwordBypassExpiresAt?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  birthday?: string;
  role: UserRole;
  assignedBarangayId?: string; // Only for teachers
  profilePicture?: string; // Base64 encoded image or URL
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  allowPasswordBypass?: boolean;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender?: string;
  birthday?: string;
  role?: UserRole;
  assignedBarangayId?: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginLog {
  _id?: string;
  userId: string;
  email: string;
  device: string;
  browser: string;
  os: string;
  ipAddress?: string;
  loginAt: string;
  createdAt: string;
}
