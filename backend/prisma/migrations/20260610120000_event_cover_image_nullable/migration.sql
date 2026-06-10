-- Event.coverImageId staje się nullable: "brak okładki" = NULL (front renderuje lokalny default),
-- zamiast wskaźnika na sentinel-row CoverImage{isDefault}. Domyślny wiersz usuwany w migracji danych.
ALTER TABLE "Event" ALTER COLUMN "coverImageId" DROP NOT NULL;
