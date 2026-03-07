import { UserBrief, EventRef } from './common.interface';

export interface OrganizerVoucher {
  id: string;
  recipientUserId: string;
  organizerUserId: string;
  eventId?: string;
  amount: number;
  remainingAmount: number;
  source: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
  organizer?: UserBrief;
  event?: EventRef;
}

export interface OrganizerVoucherGroup {
  organizer: UserBrief;
  totalBalance: number;
  vouchers: OrganizerVoucher[];
}
