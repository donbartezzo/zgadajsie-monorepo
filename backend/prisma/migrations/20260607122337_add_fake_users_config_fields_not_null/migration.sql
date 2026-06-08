-- CreateTable: EventTargetOccupancyConfig (optional 1:1 with Event)
CREATE TABLE "EventTargetOccupancyConfig" (
    "eventId"            TEXT    NOT NULL,
    "targetOccupancy"    INTEGER NOT NULL DEFAULT 35,
    "cleanupHours"       INTEGER NOT NULL DEFAULT 12,
    "minFreeSlotsBuffer" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "EventTargetOccupancyConfig_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable: EventSeriesTargetOccupancyConfig (optional 1:1 with EventSeries)
CREATE TABLE "EventSeriesTargetOccupancyConfig" (
    "seriesId"           TEXT    NOT NULL,
    "targetOccupancy"    INTEGER NOT NULL DEFAULT 35,
    "cleanupHours"       INTEGER NOT NULL DEFAULT 12,
    "minFreeSlotsBuffer" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "EventSeriesTargetOccupancyConfig_pkey" PRIMARY KEY ("seriesId")
);

-- Migrate data: create config rows for events with targetOccupancy set
INSERT INTO "EventTargetOccupancyConfig" ("eventId", "targetOccupancy")
SELECT "id", "targetOccupancy"
FROM "Event"
WHERE "targetOccupancy" IS NOT NULL;

-- Migrate data: create config rows for series with targetOccupancy set
INSERT INTO "EventSeriesTargetOccupancyConfig" ("seriesId", "targetOccupancy")
SELECT "id", "targetOccupancy"
FROM "EventSeries"
WHERE "targetOccupancy" IS NOT NULL;

-- DropColumn: remove targetOccupancy from Event
ALTER TABLE "Event" DROP COLUMN "targetOccupancy";

-- DropColumn: remove targetOccupancy from EventSeries
ALTER TABLE "EventSeries" DROP COLUMN "targetOccupancy";

-- AddForeignKey
ALTER TABLE "EventTargetOccupancyConfig" ADD CONSTRAINT "EventTargetOccupancyConfig_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeriesTargetOccupancyConfig" ADD CONSTRAINT "EventSeriesTargetOccupancyConfig_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
