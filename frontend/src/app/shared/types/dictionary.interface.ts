export interface DictionaryItem {
 id: string;
 name: string;
 slug: string;
}

export interface City extends DictionaryItem {
 isActive: boolean;
}
