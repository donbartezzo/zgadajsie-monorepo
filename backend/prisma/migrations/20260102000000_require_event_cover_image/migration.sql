-- Migration: require_event_cover_image
-- Description: Make Event.coverImageId NOT NULL and add CHECK constraint to CoverImage

-- Step 1: Ensure all events have coverImageId (should be done by backfill script first)
-- This is a safety check - if any NULL values exist, the migration will fail
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "Event" WHERE "coverImageId" IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Events with NULL coverImageId found. Run backfill-event-cover-images.ts first.';
  END IF;
END $$;

-- Step 2: Make coverImageId NOT NULL
ALTER TABLE "Event" ALTER COLUMN "coverImageId" SET NOT NULL;

-- Step 3: Add CHECK constraint to CoverImage (owner XOR discipline OR default)
ALTER TABLE "CoverImage"
ADD CONSTRAINT "cover_image_owner_xor_discipline" CHECK (
  (("ownerUserId" IS NULL AND ("disciplineSlug" IS NOT NULL OR "isDefault" = true))
   OR ("ownerUserId" IS NOT NULL AND "name" IS NOT NULL AND length("name") >= 3))
);
