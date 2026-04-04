export type ParticipationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'WITHDRAWN'
  | 'REJECTED';

/** Typ dla URL awatara użytkownika. */
export type AvatarUrl = string | null | undefined;

/** Skrócona reprezentacja użytkownika (id + displayName + avatar). */
export interface UserBrief {
  id: string;
  displayName: string;
  avatarUrl?: AvatarUrl;
}

/** Skrócona reprezentacja użytkownika z adresem email. */
export interface UserBriefWithEmail extends UserBrief {
  email: string;
}

/** Skrócona referencja do wydarzenia (id + title). */
export interface EventRef {
  id: string;
  title: string;
  city?: { slug: string };
}
