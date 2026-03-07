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

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;

  sender?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface PaginatedDirectMessages {
  data: DirectMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface Conversation {
  id: string;
  userAId: string;
  userBId: string;
  eventId?: string | null;
  createdAt: string;
  updatedAt: string;

  userA?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  userB?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  event?: {
    id: string;
    title: string;
  } | null;
  messages?: DirectMessage[];
}
