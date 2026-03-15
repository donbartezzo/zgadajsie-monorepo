import { UserBriefWithEmail, EventRef } from './common.interface';

export interface Payment {
  id: string;
  participationId: string;
  userId: string;
  eventId: string;
  amount: number;
  voucherAmountUsed: number;
  organizerAmount: number;
  platformFee: number;
  currency: string;
  status: string;
  operatorTxId?: string;
  method?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;

  event?: EventRef;
  user?: UserBriefWithEmail;
}

export interface PaginatedPayments {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface EventEarnings {
  payments: Payment[];
  totalAmount: number;
  eventId: string;
}

export interface ParticipantPaymentInfo {
  id: string;
  amount: number;
  voucherAmountUsed: number;
  organizerAmount: number;
  method: string | null;
  status: string;
  paidAt: string | null;
}

export interface ParticipantManageItem {
  id: string;
  userId: string;
  status: string;
  isGuest: boolean;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl: string | null; email: string };
  payment: ParticipantPaymentInfo | null;
}
