import { ParticipantPaymentInfo, EventSlotInfo } from './payment.interface';
export type { EnrollmentStatus, ParticipationStatus } from './common.interface';
import type { EnrollmentStatus } from './common.interface';

export interface EventSlot {
  id: string;
  eventId: string;
  enrollmentId: string | null;
  roleKey: string | null;
  confirmed: boolean;
  assignedAt: string | null;
  createdAt: string;
}

// Reason why user is waiting (didn't get automatic slot)
export type WaitingReason =
  | 'NEW_USER' // First time with this organizer, needs approval
  | 'BANNED' // Banned by organizer
  | 'NO_SLOTS' // No free slots available
  | 'NO_SLOTS_FOR_ROLE' // No free slots for selected role (but other roles available)
  | 'PRE_ENROLLMENT'; // Pre-enrollment phase, lottery pending

// Available role with free slots (used for suggestions when NO_SLOTS_FOR_ROLE)
export interface AvailableRole {
  key: string;
  title: string;
  freeSlots: number;
}

export interface AddedByUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Enrollment {
  id: string;
  eventId: string;
  userId: string;
  wantsIn: boolean;
  withdrawnBy?: string | null;
  addedByUser?: AddedByUser | null;
  isGuest: boolean;
  roleKey?: string | null;
  createdAt: string;
  updatedAt: string;

  status: EnrollmentStatus;
  slot?: EventSlotInfo | null;

  waitingReason?: WaitingReason | null;

  payment: ParticipantPaymentInfo | null;

  availableRoles?: AvailableRole[] | null;

  event?: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
    city?: { slug: string };
  };
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    email: string;
    isActive?: boolean;
    isEmailVerified?: boolean;
  };
}

/** @deprecated Use Enrollment */
export type Participation = Enrollment;
