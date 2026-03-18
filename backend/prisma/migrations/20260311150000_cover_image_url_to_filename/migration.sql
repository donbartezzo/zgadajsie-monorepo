-- Rename column url → filename
ALTER TABLE "CoverImage" RENAME COLUMN "url" TO "filename";

-- Extract just the filename from stored full URLs (e.g. "http://localhost:4300/assets/covers/events/uuid.webp" → "uuid.webp")
UPDATE "CoverImage"
SET "filename" = REVERSE(SPLIT_PART(REVERSE("filename"), '/', 1))
WHERE "filename" LIKE '%/%';
