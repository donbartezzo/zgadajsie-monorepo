import { UserBriefWithEmail, UserBrief, EventRef, EnrollmentStatus } from './common.interface';

export interface Payment {
  id: string;
  enrollmentId: string;
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

export interface EnrolleeManageItem {
  id: string;
  userId: string;
  status: EnrollmentStatus;
  isGuest: boolean;
  addedByUserId?: string;
  addedByUser?: UserBrief | null;
  roleKey?: string | null;
  slot?: EventSlotInfo | null;
  createdAt: string;
  user: UserBriefWithEmail & {
    isActive?: boolean;
    isEmailVerified?: boolean;
  };
  payment: ParticipantPaymentInfo | null;
  isNewToOrganizer?: boolean;
}

export interface EventSlotInfo {
  id: string;
  locked: boolean;
  roleKey: string | null;
  enrollmentId: string | null;
  confirmed: boolean;
  assignedAt: string | null;
  createdAt: string;
}

// Request interfaces for API calls
// Dane tożsamości gościa zbierane w kreatorze dołączania (bez profilu dyscypliny —
// poziom/wizytówkę zbiera wspólny modal profilu dyscypliny w kolejnym kroku).
export interface GuestIdentityData {
  displayName: string;
  roleKey?: string;
  avatarSeed?: string;
  userId?: string;
}

export interface JoinGuestRequest {
  displayName: string;
  // Profil dyscypliny gościa (snapshot) — poziom obowiązkowy, wizytówka opcjonalna.
  levelSlug: string;
  bio?: string | null;
  roleKey?: string;
  avatarSeed?: string;
  // Optional client-generated UUID for the new guest user. Sent so that the avatar
  // preview shown during enrollment (computed from userId + avatarSeed) matches
  // the final avatar in the participants grid.
  userId?: string;
}

export interface UpdateGuestResponse {
  id: string;
  displayName: string;
  avatarSeed: string | null;
}

export interface UpdateGuestRequest {
  displayName?: string;
  avatarSeed?: string | null;
}

export interface CancelPaymentRequest {
  refundAsVoucher: boolean;
  notifyUser: boolean;
}

export interface LockSlotResponse {
  success: boolean;
}

/** @deprecated Use EnrolleeManageItem */
export type ParticipantManageItem = EnrolleeManageItem;
