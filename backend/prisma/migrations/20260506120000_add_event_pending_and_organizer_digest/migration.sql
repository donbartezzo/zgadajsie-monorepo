-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "confirmToken" TEXT;

-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "weeklyDigestSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Event_confirmToken_key" ON "Event"("confirmToken");
