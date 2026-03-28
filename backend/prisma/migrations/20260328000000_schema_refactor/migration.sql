-- DropTable: UserEventLimit (per-user limit feature removed — hardcoded default)
DROP TABLE "UserEventLimit";

-- DropTable: SystemSetting (settings moved to code constants)
DROP TABLE "SystemSetting";

-- DropColumn: EventParticipation.isGuest (redundant — use addedByUserId IS NOT NULL)
ALTER TABLE "EventParticipation" DROP COLUMN "isGuest";

-- RenameTable: ChatMessage → EventGroupMessage (more precise name)
ALTER TABLE "ChatMessage" RENAME TO "EventGroupMessage";
ALTER TABLE "EventGroupMessage" RENAME CONSTRAINT "ChatMessage_pkey" TO "EventGroupMessage_pkey";
ALTER TABLE "EventGroupMessage" RENAME CONSTRAINT "ChatMessage_eventId_fkey" TO "EventGroupMessage_eventId_fkey";
ALTER TABLE "EventGroupMessage" RENAME CONSTRAINT "ChatMessage_userId_fkey" TO "EventGroupMessage_userId_fkey";
ALTER INDEX "ChatMessage_eventId_createdAt_idx" RENAME TO "EventGroupMessage_eventId_createdAt_idx";

-- City: use slug as PK (consistent with EventDiscipline, EventFacility, EventLevel)
-- CitySubscription references City.id — must be cleared before PK change
ALTER TABLE "CitySubscription" DROP CONSTRAINT "CitySubscription_cityId_fkey";
DELETE FROM "CitySubscription";

-- Event also references City.slug - must drop FK first
ALTER TABLE "Event" DROP CONSTRAINT "Event_citySlug_fkey";

ALTER TABLE "City" DROP CONSTRAINT "City_pkey";
DROP INDEX "City_slug_key";
ALTER TABLE "City" DROP COLUMN "id";
ALTER TABLE "City" ADD CONSTRAINT "City_pkey" PRIMARY KEY ("slug");

-- Re-create foreign keys
ALTER TABLE "Event" ADD CONSTRAINT "Event_citySlug_fkey"
  FOREIGN KEY ("citySlug") REFERENCES "City"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CitySubscription: cityId → citySlug
DROP INDEX "CitySubscription_cityId_idx";
ALTER TABLE "CitySubscription" RENAME COLUMN "cityId" TO "citySlug";
CREATE INDEX "CitySubscription_citySlug_idx" ON "CitySubscription"("citySlug");
ALTER TABLE "CitySubscription" ADD CONSTRAINT "CitySubscription_citySlug_fkey"
  FOREIGN KEY ("citySlug") REFERENCES "City"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum: new enum types
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "EventGender" AS ENUM ('MALE', 'FEMALE', 'ANY');
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "SocialProvider" AS ENUM ('GOOGLE', 'FACEBOOK');
CREATE TYPE "VoucherSource" AS ENUM ('EVENT_CANCELLATION', 'MANUAL_REFUND', 'MANUAL_CREDIT');
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'FULLY_USED', 'EXPIRED');
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'REFUNDED', 'VOUCHER_REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentCurrency" AS ENUM ('PLN');
CREATE TYPE "NotificationKind" AS ENUM (
  'NEW_APPLICATION',
  'PARTICIPATION_STATUS',
  'EVENT_CANCELLED',
  'NEW_CHAT_MESSAGE',
  'EVENT_REMINDER',
  'NEW_EVENT_IN_CITY',
  'REPRIMAND',
  'ANNOUNCEMENT',
  'PAYMENT_CANCELLED'
);
CREATE TYPE "AnnouncementPriority" AS ENUM ('CRITICAL', 'ORGANIZATIONAL', 'INFORMATIONAL');
CREATE TYPE "AnnouncementTrigger" AS ENUM ('SYSTEM', 'MANUAL');
CREATE TYPE "WithdrawnBy" AS ENUM ('USER', 'ORGANIZER');

-- AlterTable: User.role → Role enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable: Event.gender → EventGender enum
ALTER TABLE "Event" ALTER COLUMN "gender" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "gender" TYPE "EventGender" USING "gender"::"EventGender";
ALTER TABLE "Event" ALTER COLUMN "gender" SET DEFAULT 'ANY';

-- AlterTable: Event.visibility → EventVisibility enum
ALTER TABLE "Event" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "visibility" TYPE "EventVisibility" USING "visibility"::"EventVisibility";
ALTER TABLE "Event" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

-- AlterTable: SocialAccount.provider → SocialProvider enum
ALTER TABLE "SocialAccount" ALTER COLUMN "provider" TYPE "SocialProvider" USING "provider"::"SocialProvider";

-- AlterTable: OrganizerVoucher.source → VoucherSource enum
ALTER TABLE "OrganizerVoucher" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "OrganizerVoucher" ALTER COLUMN "source" TYPE "VoucherSource" USING "source"::"VoucherSource";
ALTER TABLE "OrganizerVoucher" ALTER COLUMN "source" SET DEFAULT 'EVENT_CANCELLATION';

-- AlterTable: OrganizerVoucher.status → VoucherStatus enum
ALTER TABLE "OrganizerVoucher" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OrganizerVoucher" ALTER COLUMN "status" TYPE "VoucherStatus" USING "status"::"VoucherStatus";
ALTER TABLE "OrganizerVoucher" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable: Payment.status → PaymentStatus enum
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- AlterTable: Payment.currency → PaymentCurrency enum
ALTER TABLE "Payment" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "currency" TYPE "PaymentCurrency" USING "currency"::"PaymentCurrency";
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'PLN';

-- AlterTable: Notification.type → NotificationKind enum
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationKind" USING "type"::"NotificationKind";

-- AlterTable: EventAnnouncement.priority → AnnouncementPriority enum
ALTER TABLE "EventAnnouncement" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "EventAnnouncement" ALTER COLUMN "priority" TYPE "AnnouncementPriority" USING "priority"::"AnnouncementPriority";
ALTER TABLE "EventAnnouncement" ALTER COLUMN "priority" SET DEFAULT 'INFORMATIONAL';

-- AlterTable: EventAnnouncement.trigger → AnnouncementTrigger enum
ALTER TABLE "EventAnnouncement" ALTER COLUMN "trigger" DROP DEFAULT;
ALTER TABLE "EventAnnouncement" ALTER COLUMN "trigger" TYPE "AnnouncementTrigger" USING "trigger"::"AnnouncementTrigger";
ALTER TABLE "EventAnnouncement" ALTER COLUMN "trigger" SET DEFAULT 'MANUAL';

-- AlterTable: EventParticipation.withdrawnBy → WithdrawnBy enum
ALTER TABLE "EventParticipation" ALTER COLUMN "withdrawnBy" TYPE "WithdrawnBy" USING "withdrawnBy"::"WithdrawnBy";
