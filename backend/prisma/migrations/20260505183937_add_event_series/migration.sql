-- CreateEnum
CREATE TYPE "EventSeriesRecurrenceType" AS ENUM ('INTERVAL', 'WEEKLY');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "EventSeries" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recurrenceType" "EventSeriesRecurrenceType" NOT NULL,
    "intervalDays" INTEGER,
    "daysOfWeek" INTEGER[],
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextGenerationAt" TIMESTAMP(3) NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3),
    "bufferDays" INTEGER NOT NULL DEFAULT 30,
    "autoCoverImage" BOOLEAN NOT NULL DEFAULT false,
    "templateSnapshot" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSeries_organizerId_idx" ON "EventSeries"("organizerId");

-- CreateIndex
CREATE INDEX "EventSeries_isActive_nextGenerationAt_idx" ON "EventSeries"("isActive", "nextGenerationAt");

-- CreateIndex
CREATE INDEX "Event_seriesId_startsAt_idx" ON "Event"("seriesId", "startsAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
