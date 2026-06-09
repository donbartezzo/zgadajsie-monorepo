-- Dodaje kolumny dla galerii własnych cover images i R2 storage.
-- Bezpieczna dla istniejących baz: IF NOT EXISTS / DROP NOT NULL jest idempotentna.

-- Nowe kolumny w CoverImage
ALTER TABLE "CoverImage" ADD COLUMN IF NOT EXISTS "storageKey"  TEXT;
ALTER TABLE "CoverImage" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
ALTER TABLE "CoverImage" ADD COLUMN IF NOT EXISTS "name"        TEXT;
ALTER TABLE "CoverImage" ADD COLUMN IF NOT EXISTS "isDefault"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CoverImage" ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- disciplineSlug staje się nullable (default cover nie ma dyscypliny)
ALTER TABLE "CoverImage" ALTER COLUMN "disciplineSlug" DROP NOT NULL;

-- Indeks po ownerUserId
CREATE INDEX IF NOT EXISTS "CoverImage_ownerUserId_idx" ON "CoverImage"("ownerUserId");

-- FK: ownerUserId -> User (cascade delete gdy user usunięty)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoverImage_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "CoverImage"
      ADD CONSTRAINT "CoverImage_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
