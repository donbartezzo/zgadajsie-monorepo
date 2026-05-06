-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "cronName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronLog_cronName_startedAt_idx" ON "CronLog"("cronName", "startedAt");

-- CreateIndex
CREATE INDEX "CronLog_createdAt_idx" ON "CronLog"("createdAt");
