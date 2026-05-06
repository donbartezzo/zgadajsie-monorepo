-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_parentEventId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN IF EXISTS "isRecurring";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN IF EXISTS "recurringRule";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN IF EXISTS "parentEventId";
