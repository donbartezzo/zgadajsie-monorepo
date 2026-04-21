import { Role } from '@zgadajsie/shared';
import { AuthUser } from '../interfaces/auth-user.interface';

export function isAdminUser(user: Pick<AuthUser, 'role'> | null | undefined): boolean {
  return user?.role === Role.ADMIN;
}

export function resolveUserContext(user: AuthUser): {
  userId: string;
  isAdmin: boolean;
} {
  return {
    userId: user.id,
    isAdmin: isAdminUser(user),
  };
}
