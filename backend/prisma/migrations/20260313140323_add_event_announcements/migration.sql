-- CreateTable
CREATE TABLE "EventAnnouncement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'INFORMATIONAL',
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementReceipt" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmToken" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventAnnouncement_eventId_createdAt_idx" ON "EventAnnouncement"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementReceipt_confirmToken_key" ON "AnnouncementReceipt"("confirmToken");

-- CreateIndex
CREATE INDEX "AnnouncementReceipt_confirmToken_idx" ON "AnnouncementReceipt"("confirmToken");

-- CreateIndex
CREATE INDEX "AnnouncementReceipt_announcementId_viewedAt_idx" ON "AnnouncementReceipt"("announcementId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementReceipt_announcementId_userId_key" ON "AnnouncementReceipt"("announcementId", "userId");

-- AddForeignKey
ALTER TABLE "EventAnnouncement" ADD CONSTRAINT "EventAnnouncement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAnnouncement" ADD CONSTRAINT "EventAnnouncement_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReceipt" ADD CONSTRAINT "AnnouncementReceipt_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "EventAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementReceipt" ADD CONSTRAINT "AnnouncementReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
