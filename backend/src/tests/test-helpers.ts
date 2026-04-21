import { AuthUser } from '../modules/auth/interfaces/auth-user.interface';

export function mockAuthUser(id: string, role = 'USER'): AuthUser {
  return {
    id,
    email: `${id}@example.com`,
    displayName: id,
    avatarUrl: null,
    role,
    isActive: true,
    isEmailVerified: true,
  };
}
