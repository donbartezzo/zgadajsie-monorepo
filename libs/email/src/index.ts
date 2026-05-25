export * from './types/templates';
export * from './utils/render-email';
export { EMAIL_THEME } from './theme';
export type { EmailThemeColors } from './theme';

export { Button } from './components/Button';
export { Callout } from './components/Callout';
export { Divider } from './components/Divider';
export { EventRow } from './components/EventRow';
export { Footer } from './components/Footer';
export { Header } from './components/Header';
export { Text } from './components/Text';

export { TransactionalLayout } from './layouts/TransactionalLayout';

export { default as ActivationEmail } from './templates/ActivationEmail';
export { default as AdminDailyReportEmail } from './templates/AdminDailyReportEmail';
export { default as AnnouncementEmail } from './templates/AnnouncementEmail';
export { default as ContactEmail } from './templates/ContactEmail';
export { default as EventCancelledEmail } from './templates/EventCancelledEmail';
export { default as EventReminderEmail } from './templates/EventReminderEmail';
export { default as NewApplicationEmail } from './templates/NewApplicationEmail';
export { default as NotificationDigestEmail } from './templates/NotificationDigestEmail';
export { default as OrganizerWeeklyDigestEmail } from './templates/OrganizerWeeklyDigestEmail';
export { default as ParticipationStatusEmail } from './templates/ParticipationStatusEmail';
export { default as PasswordResetEmail } from './templates/PasswordResetEmail';
export { default as PaymentConfirmationEmail } from './templates/PaymentConfirmationEmail';
export { default as PrivateChatEmail } from './templates/PrivateChatEmail';
export { default as RefundConfirmationEmail } from './templates/RefundConfirmationEmail';
export { default as ReprimandEmail } from './templates/ReprimandEmail';
