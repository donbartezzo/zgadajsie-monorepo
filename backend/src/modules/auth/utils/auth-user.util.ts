import { Role } from '@zgadajsie/shared';
import { AuthUser } from '../interfaces/auth-user.interface';

export type AuthUserLike = Pick<AuthUser, 'id' | 'role'>;

export function isAdminUser(user: Pick<AuthUser, 'role'> | null | undefined): boolean {
  return user?.role === Role.ADMIN;
}

export function resolveUserContext(user: string | AuthUserLike): {
  userId: string;
  isAdmin: boolean;
} {
  if (typeof user === 'string') {
    return { userId: user, isAdmin: false };
  }

  return {
    userId: user.id,
    isAdmin: isAdminUser(user),
  };
}
