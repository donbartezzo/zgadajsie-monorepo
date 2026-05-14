-- Backfill accountType = GUEST for users who appear as addedByUserId in EventEnrollment
-- Users with non-null addedByUserId in EventEnrollment are guests (created by joinGuest)
UPDATE "User"
SET "accountType" = 'GUEST'
WHERE id IN (
  SELECT DISTINCT "addedByUserId"
  FROM "EventParticipation"
  WHERE "addedByUserId" IS NOT NULL
);

-- All other users remain REAL (default)
