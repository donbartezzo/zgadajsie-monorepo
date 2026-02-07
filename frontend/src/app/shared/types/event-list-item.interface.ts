export interface EventListItem {
  id: string;
  title: string;
  coverImageUrl?: string;
  startsAt: string;
  endsAt: string;
  costPerPerson: number;
  address: string;
  lat: number;
  lng: number;
  gender: string;
  status: string;
  maxParticipants?: number;

  discipline?: { id: string; name: string; slug: string };
  facility?: { id: string; name: string; slug: string };
  level?: { id: string; name: string; slug: string };
  city?: { id: string; name: string; slug: string };
  organizer?: { id: string; displayName: string; avatarUrl?: string };
  _count?: { participations: number };
}
