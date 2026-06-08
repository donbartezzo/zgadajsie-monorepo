-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('CONTACT_PAGE', 'CITY_EVENTS');

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "source" "ContactSource" NOT NULL DEFAULT 'CONTACT_PAGE',
    "citySlug" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_email_createdAt_idx" ON "ContactMessage"("email", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_userId_createdAt_idx" ON "ContactMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
