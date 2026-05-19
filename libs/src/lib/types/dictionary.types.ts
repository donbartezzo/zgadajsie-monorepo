export interface DictionaryItem {
  slug: string;
}

export interface City {
  slug: string;
  name: string;
  province: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
}
