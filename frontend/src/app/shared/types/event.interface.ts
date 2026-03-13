import { DictionaryItem } from './dictionary.interface';
import { UserBrief } from './common.interface';
import { CoverImage } from './cover-image.interface';

export interface CurrentUserAccess {
 isParticipant: boolean;
 isOrganizer: boolean;
 participationStatus: string | null;
}

export interface Event {
 id: string;
 title: string;
 description?: string;
 coverImageId?: string;
 disciplineId: string;
 facilityId: string;
 levelId: string;
 cityId: string;
 organizerId: string;
 startsAt: string;
 endsAt: string;
 costPerPerson: number;
 minParticipants?: number;
 maxParticipants?: number;
 ageMin?: number;
 ageMax?: number;
 gender: string;
 visibility: string;
 autoAccept: boolean;
 status: string;
 address: string;
 lat: number;
 lng: number;
 rules?: string;
 isRecurring: boolean;
 recurringRule?: string;
 parentEventId?: string;
 createdAt: string;
 updatedAt: string;

 discipline?: DictionaryItem;
 facility?: DictionaryItem;
 level?: DictionaryItem;
 city?: DictionaryItem;
 organizer?: UserBrief;
 coverImage?: CoverImage;
 _count?: { participations: number };
 currentUserAccess?: CurrentUserAccess;
}
