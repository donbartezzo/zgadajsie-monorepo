import { ContactSource } from '@zgadajsie/shared';

export interface ContactMessage {
  id: string;
  referenceNumber: string | null;
  name: string;
  email: string;
  message: string;
  userId: string | null;
  source: ContactSource;
  citySlug: string | null;
  ipHash: string | null;
  emailSentAt: string | null;
  emailSentCount: number;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface ContactMessagesResponse {
  data: ContactMessage[];
  total: number;
  page: number;
  limit: number;
}
