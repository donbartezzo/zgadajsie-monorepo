-- DropForeignKey
ALTER TABLE "CoverImage" DROP CONSTRAINT "CoverImage_disciplineSlug_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_coverImageId_fkey";

-- AlterTable
ALTER TABLE "CoverImage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "CoverImage" ADD CONSTRAINT "CoverImage_disciplineSlug_fkey" FOREIGN KEY ("disciplineSlug") REFERENCES "EventDiscipline"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "CoverImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
