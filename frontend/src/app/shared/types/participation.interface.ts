import { UserBrief } from './common.interface';

export interface EventSlot {
  id: string;
  eventId: string;
  participationId: string | null;
  confirmed: boolean;
  assignedAt: string | null;
  createdAt: string;
}

// Derived status from slot-based model
export type ParticipationStatus =
  | 'PENDING' // wantsIn=true, no slot
  | 'APPROVED' // wantsIn=true, has slot, slot.confirmed=false
  | 'CONFIRMED' // wantsIn=true, has slot, slot.confirmed=true
  | 'WITHDRAWN' // wantsIn=false
  | 'REJECTED'; // wantsIn=false, withdrawnBy='ORGANIZER'

// Reason why user is waiting (didn't get automatic slot)
export type WaitingReason =
  | 'NEW_USER' // First time with this organizer, needs approval
  | 'BANNED' // Banned by organizer
  | 'NO_SLOTS' // No free slots available
  | 'PRE_ENROLLMENT'; // Pre-enrollment phase, lottery pending

export interface Participation {
  id: string;
  eventId: string;
  userId: string;
  wantsIn: boolean;
  withdrawnBy?: string | null;
  isChatBanned: boolean;
  addedByUserId?: string;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;

  // Derived status (computed by backend, always present in API responses)
  status: ParticipationStatus;
  slot?: EventSlot | null;

  // Reason why user is waiting (only present when status is PENDING)
  waitingReason?: WaitingReason | null;

  event?: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
    city?: { slug: string };
  };
  user?: UserBrief;
}
