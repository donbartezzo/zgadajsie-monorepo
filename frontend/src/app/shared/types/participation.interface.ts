import { UserBrief } from './common.interface';

export interface Participation {
 id: string;
 eventId: string;
 userId: string;
 status: string;
 paidAmount: number;
 addedByUserId?: string;
 isGuest: boolean;
 createdAt: string;
 updatedAt: string;

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
