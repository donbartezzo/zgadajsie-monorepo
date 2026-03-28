-- Migration: simplify ban system
-- 1. Add ReprimandType enum
-- 2. Add type/expiresAt(nullable)/eventId(nullable) to Reprimand
-- 3. Remove isChatBanned from EventParticipation

-- Create ReprimandType enum
CREATE TYPE "ReprimandType" AS ENUM ('REPRIMAND', 'BAN');

-- Add type column to Reprimand (default REPRIMAND for existing rows)
ALTER TABLE "Reprimand" ADD COLUMN "type" "ReprimandType" NOT NULL DEFAULT 'REPRIMAND';

-- Make eventId nullable in Reprimand
ALTER TABLE "Reprimand" ALTER COLUMN "eventId" DROP NOT NULL;

-- Make expiresAt nullable in Reprimand
ALTER TABLE "Reprimand" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- Drop isChatBanned from EventParticipation
ALTER TABLE "EventParticipation" DROP COLUMN IF EXISTS "isChatBanned";
