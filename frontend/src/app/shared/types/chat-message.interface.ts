import { UserBrief } from './common.interface';

export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: string;

  user?: UserBrief;
}

export interface PaginatedMessages {
  data: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface PrivateChatMessage {
  id: string;
  eventId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;

  sender?: UserBrief;
  recipient?: UserBrief;
}

export interface PaginatedPrivateMessages {
  data: PrivateChatMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatMember {
  user: UserBrief;
  status: string;
  isActive: boolean;
  isBanned: boolean;
  isWithdrawn: boolean;
  inactiveReason: string | null;
}

export interface ChatMembersResponse {
  organizer: UserBrief & { isOrganizer: true };
  members: ChatMember[];
}

export interface OrganizerConversation {
  participant: UserBrief;
  lastMessage: {
    content: string;
    createdAt: string;
    isFromOrganizer: boolean;
  } | null;
  messageCount: number;
}
