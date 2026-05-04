/**
 * Common Prisma select objects for User model
 * Used across multiple services to ensure consistency
 */

export const USER_SELECT = {
  id: true,
  displayName: true,
  avatarSeed: true,
} as const;

export const USER_SELECT_WITH_EMAIL = {
  ...USER_SELECT,
  email: true,
} as const;
