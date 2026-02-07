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
