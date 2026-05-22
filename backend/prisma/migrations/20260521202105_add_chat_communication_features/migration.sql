-- CreateTable
CREATE TABLE "PrivateChatReadReceipt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otherUserId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateChatReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateChatReadReceipt_userId_eventId_idx" ON "PrivateChatReadReceipt"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateChatReadReceipt_eventId_userId_otherUserId_key" ON "PrivateChatReadReceipt"("eventId", "userId", "otherUserId");

-- CreateTable
CREATE TABLE "PendingChatNotification" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingChatNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingChatNotification_processedAt_scheduledAt_idx" ON "PendingChatNotification"("processedAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "PendingChatNotification_recipientId_eventId_senderId_idx" ON "PendingChatNotification"("recipientId", "eventId", "senderId");

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "welcomeMessageEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "welcomeMessage" TEXT,
ADD COLUMN     "welcomeMessageEnabled" BOOLEAN NOT NULL DEFAULT true;
