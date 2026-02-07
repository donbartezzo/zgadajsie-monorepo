export interface Event {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
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
  isRecurring: boolean;
  recurringRule?: string;
  parentEventId?: string;
  createdAt: string;
  updatedAt: string;

  discipline?: { id: string; name: string; slug: string };
  facility?: { id: string; name: string; slug: string };
  level?: { id: string; name: string; slug: string };
  city?: { id: string; name: string; slug: string };
  organizer?: { id: string; displayName: string; avatarUrl?: string };
  _count?: { participations: number };
}
