/**
 * Pola wydarzenia, dla których schemat dyscypliny może podać wartości domyślne.
 * Source of truth — zarówno DisciplineSchemaBasic jak i frontendowy Event
 * powinny odwoływać się do tego interfejsu (Pick/Extends).
 */
export interface EventDefaultableFields {
  minParticipants?: number;
  maxParticipants?: number;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
}
