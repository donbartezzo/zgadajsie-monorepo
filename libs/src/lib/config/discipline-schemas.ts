import { EventDefaultableFields } from './event-defaultable-fields';

/**
 * Wspólny interfejs roli — slots opcjonalny (tylko dla special).
 */
export interface DisciplineRole {
  key: string;
  title: string;
  desc: string;
  slots?: number;
}

/**
 * Konfiguracja ról uczestników dla dyscypliny.
 * - default: rola domyślna (slots NIGDY nie ustawiany — wyliczany jako reszta)
 * - special: role specjalne (slots ZAWSZE ustawiany, min 1 element)
 */
export interface DisciplineParticipantRoles {
  default: DisciplineRole;
  special: DisciplineRole[];
}

/**
 * Podstawowy schemat dyscypliny — wartości domyślne dla pól wydarzenia.
 * Extends EventDefaultableFields dla spójności nazw pól z Event interface.
 */
export type DisciplineSchemaBasic = EventDefaultableFields & {
  // przyszłe pola specyficzne dla basic schema (np. facilityIds)
};

/**
 * Pełny schemat dyscypliny.
 */
export interface DisciplineSchema {
  basic?: DisciplineSchemaBasic;
  participantRoles?: DisciplineParticipantRoles;
}

/**
 * Statyczna konfiguracja schematów dyscyplin.
 * Klucz = slug dyscypliny (EventDiscipline.slug).
 */
export const DISCIPLINE_SCHEMAS: Record<string, DisciplineSchema> = {
  'pilka-nozna': {
    basic: {
      maxParticipants: 12,
      minParticipants: 16,
    },
    participantRoles: {
      default: { key: 'pilkarz', title: 'Piłkarz', desc: 'zawodnik grający w polu' },
      special: [
        { key: 'bramkarz', title: 'Bramkarz', desc: 'zawodnik stojący w bramce', slots: 2 },
      ],
    },
  },
};

/**
 * Pobierz schemat dyscypliny po slug.
 */
export function getDisciplineSchema(slug: string): DisciplineSchema | null {
  return DISCIPLINE_SCHEMAS[slug] ?? null;
}

/**
 * Sprawdź czy dyscyplina ma zdefiniowane role uczestników.
 */
export function hasParticipantRoles(slug: string): boolean {
  return !!DISCIPLINE_SCHEMAS[slug]?.participantRoles;
}
