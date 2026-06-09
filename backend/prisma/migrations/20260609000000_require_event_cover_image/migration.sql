-- CHECK constraint zapewniający spójność CoverImage.
-- NOT NULL na Event.coverImageId przeniesiony do migracji 20260609210000
-- (wymaga wcześniejszego backfillu eventów bez cover image).
--
-- Warunek: publiczne cover images mają disciplineSlug lub isDefault=true,
-- własne cover images mają ownerUserId i name (min 3 znaki).

ALTER TABLE "CoverImage"
ADD CONSTRAINT "cover_image_owner_xor_discipline" CHECK (
  (
    ("ownerUserId" IS NULL AND ("disciplineSlug" IS NOT NULL OR "isDefault" = true))
    OR
    ("ownerUserId" IS NOT NULL AND "name" IS NOT NULL AND length("name") >= 3)
  )
);
