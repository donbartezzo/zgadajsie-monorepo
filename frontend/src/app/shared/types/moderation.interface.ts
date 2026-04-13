import { UserBrief } from './common.interface';

export interface OrganizerUserRelation {
  id: string;
  organizerUserId: string;
  targetUserId: string;
  isBanned: boolean;
  isTrusted: boolean;
  bannedAt: string | null;
  trustedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  targetUser?: UserBrief | null;
}

export interface OrganizerUserRelationListResponse {
  data: OrganizerUserRelation[];
  total: number;
  page: number;
  limit: number;
}
