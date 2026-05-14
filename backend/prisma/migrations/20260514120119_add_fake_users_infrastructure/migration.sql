-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('REAL', 'GUEST', 'FAKE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ScheduledJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "WithdrawnBy" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "targetOccupancy" INTEGER;

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN     "targetOccupancy" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'REAL',
ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ScheduledJobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledJob_status_scheduledAt_idx" ON "ScheduledJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledJob_type_status_idx" ON "ScheduledJob"("type", "status");

-- CreateIndex
CREATE INDEX "User_accountType_idx" ON "User"("accountType");
