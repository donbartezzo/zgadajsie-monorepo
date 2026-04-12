-- Add trustedAt and bannedAt columns to OrganizerUserRelation
ALTER TABLE "OrganizerUserRelation"
ADD COLUMN "trustedAt" TIMESTAMP(3),
ADD COLUMN "bannedAt" TIMESTAMP(3);

-- Backfill dates for existing flagged records
UPDATE "OrganizerUserRelation"
SET "trustedAt" = "createdAt"
WHERE "isTrusted" = true;

UPDATE "OrganizerUserRelation"
SET "bannedAt" = "createdAt"
WHERE "isBanned" = true;

-- Backfill isTrusted=true for users who currently occupy a slot
-- in a non-cancelled event with the organizer (real users only, no guests).
-- Uses COALESCE to preserve existing trustedAt if already set.
INSERT INTO "OrganizerUserRelation" (
  "id",
  "organizerUserId",
  "targetUserId",
  "isTrusted",
  "trustedAt",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON (e."organizerId", ep."userId")
  gen_random_uuid(),
  e."organizerId",
  ep."userId",
  true,
  NOW(),
  NOW(),
  NOW()
FROM "EventParticipation" ep
JOIN "EventSlot" es ON es."participationId" = ep."id"
JOIN "Event" e ON e."id" = ep."eventId"
WHERE e."status" != 'CANCELLED'
  AND ep."addedByUserId" IS NULL
ORDER BY e."organizerId", ep."userId"
ON CONFLICT ("organizerUserId", "targetUserId")
DO UPDATE SET
  "isTrusted" = true,
  "trustedAt" = COALESCE("OrganizerUserRelation"."trustedAt", NOW()),
  "updatedAt" = NOW();
