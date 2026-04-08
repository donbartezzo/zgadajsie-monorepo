import { EventDefaultableFields } from './event-defaultable-fields';

/**
 * Wspólny interfejs roli - isDefault wymagane dla type safety.
 */
export interface DisciplineRole {
  key: string;
  slots?: number;
  isDefault: boolean;
}

/**
 * Konfiguracja ról uczestników dla dyscypliny.
 * - default: rola domyślna (isDefault: true)
 * - special: role specjalne (isDefault: false)
 */
export interface DisciplineParticipantRoles {
  default: DisciplineRole & { isDefault: true };
  special: (DisciplineRole & { isDefault: false })[];
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
