import { AccountType, Gender } from '../enums';

export interface FakeUserPersona {
  id: string;
  displayName: string;
  email: string;
  avatarSeed: string;
  gender: Gender | null;
  accountType: AccountType.FAKE;
  isActive: boolean;
}

export interface ScheduledJobPayload {
  eventId: string;
  enrollmentId?: string;
}

export interface ScheduledJobDto {
  id: string;
  type: string;
  payload: ScheduledJobPayload;
  status: string;
  scheduledAt: Date;
  startedAt: Date | null;
  executedAt: Date | null;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetTargetOccupancyDto {
  targetOccupancy: number | null;
}
