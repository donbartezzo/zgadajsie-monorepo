export interface SystemSettings {
  id: string;
  eventCreationRestricted: boolean;
  onlinePaymentsDisabled: boolean;
  updatedAt: string;
}

export interface AuthorizedOrganizer {
  id: string;
  systemSettingsId: string;
  userId: string;
  citySlug: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  city: {
    slug: string;
    name: string;
  } | null;
}
