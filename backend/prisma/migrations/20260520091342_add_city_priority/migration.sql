-- AlterTable
ALTER TABLE "City" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "City_priority_idx" ON "City"("priority");
