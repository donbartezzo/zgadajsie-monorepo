// Typ/model współdzielony między frontendem i backendem
export interface Event {
  id: string;
  title: string;
  date: string; // ISO string
  location: string;
  description?: string;
  organizerId: string;
  // Dodaj inne pola zgodnie z PRD
}