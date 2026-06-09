-- UWAGA: Ta migracja musi być zastosowana DOPIERO po uruchomieniu skryptów:
--   1. backend/scripts/seed-default-cover.ts     (tworzy rekord isDefault=true i wgrywa do R2)
--   2. backend/scripts/backfill-event-cover-images.ts  (przypisuje default cover eventom z NULL)
--   3. backend/scripts/migrate-cover-images-to-r2.ts   (backfill storageKey dla publicznych coverów)
--
-- Przed uruchomieniem sprawdź: SELECT COUNT(*) FROM "Event" WHERE "coverImageId" IS NULL;
-- Wynik musi być 0. Jeśli nie — uruchom backfill i powtórz sprawdzenie.

-- AlterTable: Event.coverImageId NOT NULL
ALTER TABLE "Event" ALTER COLUMN "coverImageId" SET NOT NULL;

-- AddCheckConstraint: CoverImage spójność ownerUserId / disciplineSlug / isDefault
ALTER TABLE "CoverImage"
ADD CONSTRAINT "cover_image_owner_xor_discipline" CHECK (
  (
    ("ownerUserId" IS NULL AND ("disciplineSlug" IS NOT NULL OR "isDefault" = true))
    OR
    ("ownerUserId" IS NOT NULL AND "name" IS NOT NULL AND length("name") >= 3)
  )
);
