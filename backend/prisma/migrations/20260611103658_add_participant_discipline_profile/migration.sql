-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_coverImageId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "socialLinks" JSONB;

-- CreateTable
CREATE TABLE "UserGuestDetails" (
    "userId" TEXT NOT NULL,
    "levelSlug" TEXT NOT NULL,
    "bio" TEXT,

    CONSTRAINT "UserGuestDetails_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ParticipantDisciplineProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "disciplineSlug" TEXT NOT NULL,
    "levelSlug" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantDisciplineProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipantDisciplineProfile_disciplineSlug_idx" ON "ParticipantDisciplineProfile"("disciplineSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantDisciplineProfile_userId_disciplineSlug_key" ON "ParticipantDisciplineProfile"("userId", "disciplineSlug");

-- AddForeignKey
ALTER TABLE "UserGuestDetails" ADD CONSTRAINT "UserGuestDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuestDetails" ADD CONSTRAINT "UserGuestDetails_levelSlug_fkey" FOREIGN KEY ("levelSlug") REFERENCES "EventLevel"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantDisciplineProfile" ADD CONSTRAINT "ParticipantDisciplineProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantDisciplineProfile" ADD CONSTRAINT "ParticipantDisciplineProfile_disciplineSlug_fkey" FOREIGN KEY ("disciplineSlug") REFERENCES "EventDiscipline"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantDisciplineProfile" ADD CONSTRAINT "ParticipantDisciplineProfile_levelSlug_fkey" FOREIGN KEY ("levelSlug") REFERENCES "EventLevel"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "CoverImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
