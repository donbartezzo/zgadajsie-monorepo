import type { User } from './user.interface';

export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'WITHDRAWN' | 'REJECTED';

/** @deprecated Use EnrollmentStatus */
export type ParticipationStatus = EnrollmentStatus;

/** Minimalne dane użytkownika potrzebne do wyświetlenia avatara i nazwy. */
export interface AvatarUser {
  id: string;
  displayName: string;
  avatarSeed?: string | null;
}

/** Skrócona reprezentacja użytkownika (id + displayName + avatar + donationUrl). */
export type UserBrief = AvatarUser & Pick<User, 'donationUrl'>;

/** Skrócona reprezentacja użytkownika z adresem email. */
export type UserBriefWithEmail = UserBrief & Pick<User, 'email'>;

/** Skrócona referencja do wydarzenia (id + title). */
export interface EventRef {
  id: string;
  title: string;
  city?: { slug: string };
}
