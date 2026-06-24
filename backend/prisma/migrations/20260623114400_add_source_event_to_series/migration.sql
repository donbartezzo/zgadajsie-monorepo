-- AlterTable
ALTER TABLE "EventSeries" ADD COLUMN     "sourceEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventSeries_sourceEventId_key" ON "EventSeries"("sourceEventId");

-- AddForeignKey
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
