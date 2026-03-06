-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "voucherAmountUsed" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrganizerVoucher" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "organizerUserId" TEXT NOT NULL,
    "eventId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "remainingAmount" DECIMAL(10,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'EVENT_CANCELLATION',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerVoucher_recipientUserId_organizerUserId_status_idx" ON "OrganizerVoucher"("recipientUserId", "organizerUserId", "status");

-- CreateIndex
CREATE INDEX "OrganizerVoucher_organizerUserId_status_idx" ON "OrganizerVoucher"("organizerUserId", "status");

-- AddForeignKey
ALTER TABLE "OrganizerVoucher" ADD CONSTRAINT "OrganizerVoucher_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerVoucher" ADD CONSTRAINT "OrganizerVoucher_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerVoucher" ADD CONSTRAINT "OrganizerVoucher_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
