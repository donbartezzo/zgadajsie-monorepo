-- Fix guest account type assignment
-- Previous migration (20260514140134) incorrectly set GUEST for addedByUserId (hosts) instead of userId (guests)
-- This migration:
-- 1. Sets accountType = 'GUEST' for users with @guest.zgadajsie.pl email (guest placeholder emails)
-- 2. Ensures hosts (users who appear as addedByUserId) remain REAL
-- 3. Resets any incorrectly marked hosts back to REAL

-- Step 1: Set GUEST for users with guest placeholder emails
UPDATE "User"
SET "accountType" = 'GUEST'
WHERE "email" LIKE '%@guest.zgadajsie.pl'
  AND "accountType" = 'REAL';

-- Step 2: Ensure hosts (users who added guests) are REAL
-- Users who appear as addedByUserId are hosts (real users who added guests).
-- NOTE: model EventEnrollment is mapped to the physical table "EventParticipation"
-- via @@map in schema.prisma; raw SQL must use the physical table name.
UPDATE "User"
SET "accountType" = 'REAL'
WHERE id IN (
  SELECT DISTINCT "addedByUserId"
  FROM "EventParticipation"
  WHERE "addedByUserId" IS NOT NULL
)
AND "accountType" = 'GUEST';

-- Step 3: Ensure users with real email domains are REAL (safety net)
UPDATE "User"
SET "accountType" = 'REAL'
WHERE "email" NOT LIKE '%@guest.zgadajsie.pl'
  AND "email" NOT LIKE '%@example.com'
  AND "email" NOT LIKE '%@example.org'
  AND "email" NOT LIKE '%@example.net'
  AND "accountType" = 'GUEST';
