/**
 * Common Prisma select objects for User model
 * Used across multiple services to ensure consistency
 */

export const USER_SELECT = {
  id: true,
  displayName: true,
  avatarSeed: true,
  accountType: true,
  gender: true,
} as const;

// Email (REAL-only) żyje w UserRealDetails (1:1). Konsumenci czytają user.realDetails?.email.
export const USER_SELECT_WITH_EMAIL = {
  ...USER_SELECT,
  realDetails: { select: { email: true } },
} as const;
