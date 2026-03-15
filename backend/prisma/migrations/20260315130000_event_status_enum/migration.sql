-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable: safely convert String → Enum without data loss
ALTER TABLE "Event" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "status" TYPE "EventStatus" USING "status"::"EventStatus";
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
