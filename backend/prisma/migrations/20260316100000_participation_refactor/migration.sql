-- ============================================================================
-- Migration: Participation Refactor
-- Pre-zapisy + Losowanie + Otwarte zapisy
-- ============================================================================

-- 1. Migrate participation statuses
UPDATE "EventParticipation" SET status = 'PENDING' WHERE status IN ('APPLIED', 'PENDING_PAYMENT');
UPDATE "EventParticipation" SET status = 'CONFIRMED' WHERE status IN ('ACCEPTED', 'PARTICIPANT');
UPDATE "EventParticipation" SET status = 'WITHDRAWN' WHERE status = 'RESERVE';
-- WITHDRAWN stays as WITHDRAWN
-- REJECTED stays as REJECTED (if any exist)

-- 2. Event: remove autoAccept, add lotteryExecutedAt
ALTER TABLE "Event" DROP COLUMN "autoAccept";
ALTER TABLE "Event" ADD COLUMN "lotteryExecutedAt" TIMESTAMP(3);

-- 3. Event: make maxParticipants NOT NULL (set default for existing NULLs first)
UPDATE "Event" SET "maxParticipants" = 30 WHERE "maxParticipants" IS NULL;
ALTER TABLE "Event" ALTER COLUMN "maxParticipants" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "maxParticipants" DROP DEFAULT;

-- 4. EventParticipation: add new fields, change default status
ALTER TABLE "EventParticipation" ADD COLUMN "organizerPicked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventParticipation" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "EventParticipation" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 5. Set lotteryExecutedAt for existing events that are past the T-48h mark
UPDATE "Event"
SET "lotteryExecutedAt" = "startsAt" - INTERVAL '48 hours'
WHERE status = 'ACTIVE'
  AND "startsAt" - INTERVAL '48 hours' < NOW()
  AND "lotteryExecutedAt" IS NULL;

-- 6. Replace OrganizerBan with OrganizerUserRelation
CREATE TABLE "OrganizerUserRelation" (
    "id" TEXT NOT NULL,
    "organizerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerUserRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizerUserRelation_organizerUserId_targetUserId_key" ON "OrganizerUserRelation"("organizerUserId", "targetUserId");

-- Migrate existing bans
INSERT INTO "OrganizerUserRelation" ("id", "organizerUserId", "targetUserId", "isBanned", "isTrusted", "note", "createdAt", "updatedAt")
SELECT "id", "organizerUserId", "bannedUserId", true, false, "reason", "createdAt", "createdAt"
FROM "OrganizerBan";

-- Drop old table
DROP TABLE "OrganizerBan";

-- 7. Add foreign keys for OrganizerUserRelation
ALTER TABLE "OrganizerUserRelation" ADD CONSTRAINT "OrganizerUserRelation_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizerUserRelation" ADD CONSTRAINT "OrganizerUserRelation_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
