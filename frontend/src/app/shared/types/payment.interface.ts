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
