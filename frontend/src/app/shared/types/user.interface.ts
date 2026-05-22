export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarSeed?: string | null;
  donationUrl?: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  welcomeMessage?: string | null;
  welcomeMessageEnabled?: boolean;
}
