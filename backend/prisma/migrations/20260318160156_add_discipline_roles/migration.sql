-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "roleConfig" JSONB;

-- AlterTable
ALTER TABLE "EventParticipation" ADD COLUMN     "roleKey" TEXT;

-- AlterTable
ALTER TABLE "EventSlot" ADD COLUMN     "roleKey" TEXT;

-- CreateIndex
CREATE INDEX "EventSlot_eventId_roleKey_idx" ON "EventSlot"("eventId", "roleKey");
