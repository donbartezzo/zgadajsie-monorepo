import { ContactSource } from '../../../src/lib/enums/contact-source.enum';

export interface ActivationEmailProps {
  displayName: string;
  activationLink: string;
}

export interface PasswordResetEmailProps {
  resetLink: string;
}

/**
 * Statusy uczestnictwa, dla których istnieje szablon e-mail transakcyjnego.
 * Runtime-owe źródło prawdy (tablica) - z niego wyprowadzamy typ oraz strażnika
 * renderowalności po stronie backendu, bez duplikowania listy wartości.
 */
export const PARTICIPATION_EMAIL_STATUSES = [
  'SLOT_ASSIGNED',
  'APPROVAL_REMINDER',
  'CONFIRMED',
  'REMOVED',
  'REJECTED',
] as const;

export type ParticipationStatus = (typeof PARTICIPATION_EMAIL_STATUSES)[number];

export interface ParticipationStatusEmailProps {
  displayName: string;
  eventTitle: string;
  status: ParticipationStatus;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface EventCancelledEmailProps {
  displayName: string;
  eventTitle: string;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface NewApplicationEmailProps {
  organizerName: string;
  applicantName: string;
  eventTitle: string;
  manageLink: string;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface PaymentConfirmationEmailProps {
  displayName: string;
  eventTitle: string;
  amount: number;
  eventLink: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface RefundConfirmationEmailProps {
  displayName: string;
  eventTitle: string;
  amount: number;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface ReprimandEmailProps {
  displayName: string;
  eventTitle: string;
  reason: string;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface AnnouncementEmailProps {
  displayName: string;
  eventTitle: string;
  message: string;
  priority: 'INFO' | 'ORGANIZATIONAL' | 'CRITICAL';
  confirmLink: string;
  eventLink?: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface EventReminderEmailProps {
  displayName: string;
  eventTitle: string;
  eventTime: string;
  eventLink: string;
  showGroupChat?: boolean;
  showOrganizerChat?: boolean;
}

export interface ContactEmailProps {
  senderName: string;
  senderEmail: string;
  message: string;
  source?: ContactSource;
  citySlug?: string;
  referenceNumber?: string;
}

export interface OrganizerWeeklyDigestEmailProps {
  displayName: string;
  frontendUrl: string;
  period: { from: string; to: string };
  pendingConfirmations: Array<{
    id: string;
    title: string;
    startsAt: string;
    seriesName: string | null;
    confirmToken: string | null;
  }>;
  upcoming: Array<{ id: string; title: string; startsAt: string; enrollmentCount: number }>;
  recentlyCreated: Array<{ id: string; title: string }>;
  recentlyEnded: Array<{ id: string; title: string; enrollmentCount: number }>;
  recentlyCancelled: Array<{ id: string; title: string }>;
  activeSeries: Array<{
    id: string;
    name: string;
    pendingCount: number;
    suspendedReason: string | null;
  }>;
}

export interface AdminDailyReportEmailProps {
  date: string;
  environment: string;
  cronStatus: Array<{
    name: string;
    lastRun: string | null;
    lastError: string | null;
    status: 'OK' | 'STUCK' | 'ERROR';
  }>;
  stats: { activeEvents: number; totalUsers: number; newUsersToday: number };
  logsCleaned: number;
}

export interface NotificationDigestEmailProps {
  displayName: string;
  frontendUrl: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
    link: string | null;
    createdAt: Date;
  }>;
}

export interface EmailTemplates {
  activation: ActivationEmailProps;
  passwordReset: PasswordResetEmailProps;
  participationStatus: ParticipationStatusEmailProps;
  eventCancelled: EventCancelledEmailProps;
  newApplication: NewApplicationEmailProps;
  paymentConfirmation: PaymentConfirmationEmailProps;
  refundConfirmation: RefundConfirmationEmailProps;
  reprimand: ReprimandEmailProps;
  announcement: AnnouncementEmailProps;
  eventReminder: EventReminderEmailProps;
  contact: ContactEmailProps;
  organizerWeeklyDigest: OrganizerWeeklyDigestEmailProps;
  adminDailyReport: AdminDailyReportEmailProps;
}
