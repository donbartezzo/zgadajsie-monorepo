-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "referenceNumber" TEXT;

-- CreateIndex
CREATE INDEX "ContactMessage_referenceNumber_idx" ON "ContactMessage"("referenceNumber");
