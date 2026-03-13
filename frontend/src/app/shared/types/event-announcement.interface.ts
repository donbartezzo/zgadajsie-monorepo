import { UserBrief } from './common.interface';

export interface AnnouncementReceipt {
  id: string;
  viewedAt: string | null;
  confirmedAt: string | null;
  confirmToken: string;
}

export interface EventAnnouncement {
  id: string;
  eventId: string;
  organizerId: string;
  message: string;
  priority: string;
  trigger: string;
  createdAt: string;
  organizer?: UserBrief;
  receipts?: AnnouncementReceipt[];
}

export interface EventAnnouncementsResponse {
  announcements: EventAnnouncement[];
  hasAnnouncements: boolean;
}

export interface AnnouncementReceiptStats {
  total: number;
  viewed: number;
  confirmed: number;
}
