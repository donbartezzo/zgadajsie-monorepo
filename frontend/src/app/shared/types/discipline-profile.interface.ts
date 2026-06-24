// Profil dyscypliny realnego uczestnika (globalny na koncie, per dyscyplina).
// Backend: docs/tasks/implementacja_profilu_gracza.md
export interface DisciplineProfile {
  id: string;
  userId: string;
  disciplineSlug: string;
  levelSlug: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDisciplineProfileRequest {
  levelSlug: string;
  bio?: string | null;
}

// Statystyki uczestnika (konto główne REAL).
export interface ParticipantStats {
  registeredAt: string | null;
  totalEnrollments: number;
  completedWithSlot: number;
  trustedByCount: number;
}

// Profil dyscypliny widziany przez organizatora (REAL → pełny, GUEST → snapshot).
export interface OrganizerParticipantProfile {
  user: {
    id: string;
    displayName: string;
    avatarSeed: string | null;
    accountType: string;
  };
  isGuest: boolean;
  socialLinks: string[] | null;
  stats: ParticipantStats | null;
  isTrusted: boolean;
  isNewToOrganizer: boolean;
  disciplineProfile: { levelSlug: string; bio: string | null } | null;
}

// Payload błędu 409 zwracanego przez join/rejoin gdy brak profilu dyscypliny.
export const DISCIPLINE_PROFILE_REQUIRED_CODE = 'DISCIPLINE_PROFILE_REQUIRED';

export interface DisciplineProfileRequiredError {
  code: typeof DISCIPLINE_PROFILE_REQUIRED_CODE;
  disciplineSlug: string;
  message: string;
}
