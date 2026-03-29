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
 * Sprawdź czy dyscyplina ma zdefiniowane role uczestników.
 */
export function hasParticipantRoles(schema: DisciplineSchema | null): boolean {
  return !!schema?.participantRoles;
}
