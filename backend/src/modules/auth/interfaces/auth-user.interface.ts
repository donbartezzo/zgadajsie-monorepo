export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
}
