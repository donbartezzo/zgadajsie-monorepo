import type { AvatarUrl } from './common.interface';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: AvatarUrl;
  donationUrl?: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
