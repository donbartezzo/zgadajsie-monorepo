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
  organizer?: { id: string; displayName: string; avatarUrl?: string };
  event?: { id: string; title: string };
}

export interface OrganizerVoucherGroup {
  organizer: { id: string; displayName: string; avatarUrl: string | null };
  totalBalance: number;
  vouchers: OrganizerVoucher[];
}
