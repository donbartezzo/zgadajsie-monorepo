/*
  Warnings:

  - The values [CANCELLED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationKind_new" AS ENUM ('NEW_APPLICATION', 'PARTICIPATION_STATUS', 'EVENT_CANCELLED', 'NEW_CHAT_MESSAGE', 'EVENT_REMINDER', 'NEW_EVENT_IN_CITY', 'REPRIMAND', 'ANNOUNCEMENT', 'PAYMENT_CANCELLED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationKind_new" USING ("type"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "NotificationKind_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('COMPLETED', 'REFUNDED', 'VOUCHER_REFUNDED');
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Reprimand" DROP CONSTRAINT "Reprimand_eventId_fkey";

-- AlterTable
ALTER TABLE "EventDiscipline" ADD COLUMN     "schema" JSONB;

-- AddForeignKey
ALTER TABLE "Reprimand" ADD CONSTRAINT "Reprimand_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CitySubscription_userId_cityId_key" RENAME TO "CitySubscription_userId_citySlug_key";
