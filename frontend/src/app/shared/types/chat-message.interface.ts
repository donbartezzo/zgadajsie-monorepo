export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: string;

  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
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

  sender?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface PaginatedPrivateMessages {
  data: PrivateChatMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatMember {
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  status: string;
  isActive: boolean;
  isBanned: boolean;
  isWithdrawn: boolean;
  inactiveReason: string | null;
}

export interface ChatMembersResponse {
  organizer: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    isOrganizer: true;
  };
  members: ChatMember[];
}

export interface OrganizerConversation {
  participant: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isFromOrganizer: boolean;
  } | null;
  messageCount: number;
}
