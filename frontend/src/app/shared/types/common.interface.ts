import type { User } from './user.interface';

export type ParticipationStatus = 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'WITHDRAWN' | 'REJECTED';

/** Typ dla URL awatara użytkownika. */
export type AvatarUrl = string | null | undefined;

/** Skrócona reprezentacja użytkownika (id + displayName + avatar). */
export type UserBrief = Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'donationUrl'>;

/** Skrócona reprezentacja użytkownika z adresem email. */
export type UserBriefWithEmail = UserBrief & Pick<User, 'email'>;

/** Skrócona referencja do wydarzenia (id + title). */
export interface EventRef {
  id: string;
  title: string;
  city?: { slug: string };
}
