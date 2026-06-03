-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailSentCount" INTEGER NOT NULL DEFAULT 0;
