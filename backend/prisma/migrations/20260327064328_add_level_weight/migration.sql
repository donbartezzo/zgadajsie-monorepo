/*
  Warnings:

  - You are about to drop the column `disciplineId` on the `CoverImage` table. All the data in the column will be lost.
  - You are about to drop the column `originalName` on the `CoverImage` table. All the data in the column will be lost.
  - You are about to drop the column `cityId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `disciplineId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `facilityId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `levelId` on the `Event` table. All the data in the column will be lost.
  - The primary key for the `EventDiscipline` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `EventDiscipline` table. All the data in the column will be lost.
  - The primary key for the `EventFacility` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `EventFacility` table. All the data in the column will be lost.
  - The primary key for the `EventLevel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `EventLevel` table. All the data in the column will be lost.
  - Added the required column `disciplineSlug` to the `CoverImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `citySlug` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `disciplineSlug` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `facilitySlug` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `levelSlug` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CoverImage" DROP CONSTRAINT "CoverImage_disciplineId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_cityId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_disciplineId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_levelId_fkey";

-- DropIndex
DROP INDEX "CoverImage_disciplineId_idx";

-- DropIndex
DROP INDEX "Event_cityId_status_startsAt_idx";

-- DropIndex
DROP INDEX "EventDiscipline_slug_key";

-- DropIndex
DROP INDEX "EventFacility_slug_key";

-- DropIndex
DROP INDEX "EventLevel_slug_key";

-- AlterTable
ALTER TABLE "CoverImage" DROP COLUMN "disciplineId",
DROP COLUMN "originalName",
ADD COLUMN     "disciplineSlug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "cityId",
DROP COLUMN "disciplineId",
DROP COLUMN "facilityId",
DROP COLUMN "levelId",
ADD COLUMN     "citySlug" TEXT NOT NULL,
ADD COLUMN     "disciplineSlug" TEXT NOT NULL,
ADD COLUMN     "facilitySlug" TEXT NOT NULL,
ADD COLUMN     "levelSlug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EventDiscipline" DROP CONSTRAINT "EventDiscipline_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "EventDiscipline_pkey" PRIMARY KEY ("slug");

-- AlterTable
ALTER TABLE "EventFacility" DROP CONSTRAINT "EventFacility_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "EventFacility_pkey" PRIMARY KEY ("slug");

-- AlterTable
ALTER TABLE "EventLevel" DROP CONSTRAINT "EventLevel_pkey",
DROP COLUMN "id",
ADD COLUMN     "weight" INTEGER,
ADD CONSTRAINT "EventLevel_pkey" PRIMARY KEY ("slug");

-- CreateIndex
CREATE INDEX "CoverImage_disciplineSlug_idx" ON "CoverImage"("disciplineSlug");

-- CreateIndex
CREATE INDEX "Event_citySlug_status_startsAt_idx" ON "Event"("citySlug", "status", "startsAt");

-- AddForeignKey
ALTER TABLE "CoverImage" ADD CONSTRAINT "CoverImage_disciplineSlug_fkey" FOREIGN KEY ("disciplineSlug") REFERENCES "EventDiscipline"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_citySlug_fkey" FOREIGN KEY ("citySlug") REFERENCES "City"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_disciplineSlug_fkey" FOREIGN KEY ("disciplineSlug") REFERENCES "EventDiscipline"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_facilitySlug_fkey" FOREIGN KEY ("facilitySlug") REFERENCES "EventFacility"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_levelSlug_fkey" FOREIGN KEY ("levelSlug") REFERENCES "EventLevel"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
