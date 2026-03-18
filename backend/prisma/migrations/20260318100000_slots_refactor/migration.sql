-- Slots Refactor Migration
-- This migration:
-- 1. Adds new columns to EventParticipation (wantsIn, withdrawnBy)
-- 2. Creates EventSlot table
-- 3. Migrates data from old status-based model to new slot-based model
-- 4. Removes old columns (status, approvedAt, organizerPicked)

-- Step 1: Add new columns to EventParticipation
ALTER TABLE "EventParticipation" ADD COLUMN "wantsIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EventParticipation" ADD COLUMN "withdrawnBy" TEXT;

-- Step 2: Create EventSlot table
CREATE TABLE "EventSlot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participationId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSlot_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on participationId (ensures 1:1 relationship)
CREATE UNIQUE INDEX "EventSlot_participationId_key" ON "EventSlot"("participationId");

-- Create index on eventId for fast queries
CREATE INDEX "EventSlot_eventId_idx" ON "EventSlot"("eventId");

-- Add foreign key constraints
ALTER TABLE "EventSlot" ADD CONSTRAINT "EventSlot_eventId_fkey" 
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventSlot" ADD CONSTRAINT "EventSlot_participationId_fkey" 
    FOREIGN KEY ("participationId") REFERENCES "EventParticipation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 3: Create empty slots for all events based on maxParticipants
INSERT INTO "EventSlot" ("id", "eventId", "participationId", "confirmed", "assignedAt", "createdAt")
SELECT 
    gen_random_uuid()::text,
    e."id",
    NULL,
    false,
    NULL,
    NOW()
FROM "Event" e
CROSS JOIN generate_series(1, e."maxParticipants") AS slot_num;

-- Step 4: Migrate participation data

-- 4a: Set wantsIn = false and withdrawnBy for WITHDRAWN participants
UPDATE "EventParticipation"
SET "wantsIn" = false, "withdrawnBy" = 'USER'
WHERE "status" = 'WITHDRAWN';

-- 4b: Set wantsIn = false and withdrawnBy for REJECTED participants
UPDATE "EventParticipation"
SET "wantsIn" = false, "withdrawnBy" = 'ORGANIZER'
WHERE "status" = 'REJECTED';

-- 4c: wantsIn stays true (default) for PENDING, APPROVED, CONFIRMED, PENDING_PAYMENT

-- Step 5: Assign slots to participants with APPROVED, CONFIRMED, or PENDING_PAYMENT status
-- We need to assign one slot per such participant, ordered by approvedAt/createdAt

-- Create a temporary table with ranked participations that need slots
CREATE TEMP TABLE temp_slot_assignments AS
SELECT 
    p."id" as participation_id,
    p."eventId",
    p."status",
    p."approvedAt",
    ROW_NUMBER() OVER (
        PARTITION BY p."eventId" 
        ORDER BY COALESCE(p."approvedAt", p."createdAt") ASC
    ) as slot_rank
FROM "EventParticipation" p
WHERE p."status" IN ('APPROVED', 'CONFIRMED', 'PENDING_PAYMENT');

-- Create a temporary table with ranked empty slots per event
CREATE TEMP TABLE temp_available_slots AS
SELECT 
    s."id" as slot_id,
    s."eventId",
    ROW_NUMBER() OVER (
        PARTITION BY s."eventId" 
        ORDER BY s."createdAt" ASC
    ) as slot_rank
FROM "EventSlot" s
WHERE s."participationId" IS NULL;

-- Update slots with participation assignments
UPDATE "EventSlot" s
SET 
    "participationId" = a.participation_id,
    "confirmed" = CASE 
        WHEN a."status" = 'CONFIRMED' THEN true 
        ELSE false 
    END,
    "assignedAt" = COALESCE(
        (SELECT p."approvedAt" FROM "EventParticipation" p WHERE p."id" = a.participation_id),
        NOW()
    )
FROM temp_slot_assignments a
JOIN temp_available_slots avail ON avail."eventId" = a."eventId" AND avail.slot_rank = a.slot_rank
WHERE s."id" = avail.slot_id;

-- Clean up temp tables
DROP TABLE temp_slot_assignments;
DROP TABLE temp_available_slots;

-- Step 6: Remove old columns from EventParticipation
ALTER TABLE "EventParticipation" DROP COLUMN "status";
ALTER TABLE "EventParticipation" DROP COLUMN "approvedAt";
ALTER TABLE "EventParticipation" DROP COLUMN "organizerPicked";
