-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'NEW_PRIVATE_MESSAGE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "updatedAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "groupKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "aggregateCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Notification" ADD COLUMN "relevanceUntil" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "deleteAfter" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "pushSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "emailSentAt" TIMESTAMP(3);

-- Data migration: convert isRead → readAt
UPDATE "Notification" SET "readAt" = "createdAt" WHERE "isRead" = true;
-- updatedAt = createdAt for existing records
UPDATE "Notification" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
-- deleteAfter = createdAt + 30d for unread, readAt + 7d for read
UPDATE "Notification" SET "deleteAfter" = "createdAt" + INTERVAL '30 days' WHERE "readAt" IS NULL;
UPDATE "Notification" SET "deleteAfter" = "readAt" + INTERVAL '7 days' WHERE "readAt" IS NOT NULL;

-- AlterTable: SET NOT NULL
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "deleteAfter" SET NOT NULL;

-- AlterTable: drop isRead
ALTER TABLE "Notification" DROP COLUMN "isRead";

-- DropIndex
DROP INDEX IF EXISTS "Notification_userId_isRead_createdAt_idx";

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX "Notification_deleteAfter_idx" ON "Notification"("deleteAfter");
CREATE INDEX "Notification_userId_groupKey_idx" ON "Notification"("userId", "groupKey");

-- CreateIndex (partial indexes)
CREATE INDEX "notifications_user_unread_idx" ON "Notification"("userId") WHERE "readAt" IS NULL;
CREATE INDEX "notifications_push_pending_idx" ON "Notification"("createdAt") WHERE "readAt" IS NULL AND "pushSentAt" IS NULL;
CREATE INDEX "notifications_email_pending_idx" ON "Notification"("createdAt") WHERE "readAt" IS NULL AND "emailSentAt" IS NULL;
