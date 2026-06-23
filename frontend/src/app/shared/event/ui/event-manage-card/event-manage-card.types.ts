export type ManageAction = 'confirm' | 'manage' | 'edit' | 'cancel' | 'delete' | 'duplicate';

export interface EventManageCardItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  citySlug?: string;
  seriesId?: string | null;
  confirmToken?: string | null;
  coverImage?: { storageKey?: string | null } | null;
  address: string;
  costPerPerson?: number;
  maxParticipants?: number;
  enrollmentCount?: number;
  participantCount?: number;
}

export interface ManageActionEvent {
  type: ManageAction;
  eventId: string;
  seriesId?: string | null;
}
