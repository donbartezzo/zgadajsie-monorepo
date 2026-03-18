/**
 * Konfiguracja roli w wydarzeniu (snapshot z schematu dyscypliny).
 */
export interface EventRole {
  key: string;
  title: string;
  desc: string;
  slots: number;
  isDefault: boolean;
}

/**
 * Konfiguracja ról dla wydarzenia (przechowywana jako JSON w Event.roleConfig).
 */
export interface EventRoleConfig {
  disciplineSlug: string;
  roles: EventRole[];
}

/**
 * Informacja o dostępnych rolach z wolnymi slotami.
 */
export interface AvailableRole {
  key: string;
  title: string;
  freeSlots: number;
}
