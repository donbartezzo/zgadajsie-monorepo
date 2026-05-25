-- Add new columns to CoverImage
ALTER TABLE "CoverImage" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "CoverImage" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "CoverImage" ADD COLUMN "name" TEXT;
ALTER TABLE "CoverImage" ADD COLUMN "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "CoverImage" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Make disciplineSlug nullable
ALTER TABLE "CoverImage" ALTER COLUMN "disciplineSlug" DROP NOT NULL;

-- Add foreign key to User
ALTER TABLE "CoverImage" ADD CONSTRAINT "CoverImage_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index on ownerUserId
CREATE INDEX "CoverImage_ownerUserId_idx" ON "CoverImage"("ownerUserId");

-- Add relation to User
-- This will be handled by Prisma schema, not SQL
