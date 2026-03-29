-- Migration: i18n slugs and remove name from EventDiscipline, EventFacility, EventLevel
-- Step 1: Rename discipline slugs (PL → EN)
-- Step 2: Rename facility slugs (PL → EN)
-- Step 3: Rename level slugs (PL → EN)
-- Step 4: Drop name column from all three tables

-- ─── EventDiscipline slugs ────────────────────────────────────────────────────
-- FK references in Event.disciplineSlug and CoverImage.disciplineSlug
-- We must update FK columns before renaming PK

-- Update FK references in Event
UPDATE "Event" SET "disciplineSlug" = 'football'      WHERE "disciplineSlug" = 'pilka-nozna';
UPDATE "Event" SET "disciplineSlug" = 'volleyball'    WHERE "disciplineSlug" = 'siatkowka';
UPDATE "Event" SET "disciplineSlug" = 'basketball'    WHERE "disciplineSlug" = 'koszykowka';
UPDATE "Event" SET "disciplineSlug" = 'tennis'        WHERE "disciplineSlug" = 'tenis';
UPDATE "Event" SET "disciplineSlug" = 'running'       WHERE "disciplineSlug" = 'bieganie';
UPDATE "Event" SET "disciplineSlug" = 'cycling'       WHERE "disciplineSlug" = 'kolarstwo';
UPDATE "Event" SET "disciplineSlug" = 'swimming'      WHERE "disciplineSlug" = 'plywanie';
UPDATE "Event" SET "disciplineSlug" = 'darts'         WHERE "disciplineSlug" = 'rzutki';
UPDATE "Event" SET "disciplineSlug" = 'chess'         WHERE "disciplineSlug" = 'szachy';
UPDATE "Event" SET "disciplineSlug" = 'table-tennis'  WHERE "disciplineSlug" = 'tenis-stolowy';

-- Update FK references in CoverImage
UPDATE "CoverImage" SET "disciplineSlug" = 'football'      WHERE "disciplineSlug" = 'pilka-nozna';
UPDATE "CoverImage" SET "disciplineSlug" = 'volleyball'    WHERE "disciplineSlug" = 'siatkowka';
UPDATE "CoverImage" SET "disciplineSlug" = 'basketball'    WHERE "disciplineSlug" = 'koszykowka';
UPDATE "CoverImage" SET "disciplineSlug" = 'tennis'        WHERE "disciplineSlug" = 'tenis';
UPDATE "CoverImage" SET "disciplineSlug" = 'running'       WHERE "disciplineSlug" = 'bieganie';
UPDATE "CoverImage" SET "disciplineSlug" = 'cycling'       WHERE "disciplineSlug" = 'kolarstwo';
UPDATE "CoverImage" SET "disciplineSlug" = 'swimming'      WHERE "disciplineSlug" = 'plywanie';
UPDATE "CoverImage" SET "disciplineSlug" = 'darts'         WHERE "disciplineSlug" = 'rzutki';
UPDATE "CoverImage" SET "disciplineSlug" = 'chess'         WHERE "disciplineSlug" = 'szachy';
UPDATE "CoverImage" SET "disciplineSlug" = 'table-tennis'  WHERE "disciplineSlug" = 'tenis-stolowy';

-- Rename EventDiscipline PKs
UPDATE "EventDiscipline" SET "slug" = 'football'      WHERE "slug" = 'pilka-nozna';
UPDATE "EventDiscipline" SET "slug" = 'volleyball'    WHERE "slug" = 'siatkowka';
UPDATE "EventDiscipline" SET "slug" = 'basketball'    WHERE "slug" = 'koszykowka';
UPDATE "EventDiscipline" SET "slug" = 'tennis'        WHERE "slug" = 'tenis';
UPDATE "EventDiscipline" SET "slug" = 'running'       WHERE "slug" = 'bieganie';
UPDATE "EventDiscipline" SET "slug" = 'cycling'       WHERE "slug" = 'kolarstwo';
UPDATE "EventDiscipline" SET "slug" = 'swimming'      WHERE "slug" = 'plywanie';
UPDATE "EventDiscipline" SET "slug" = 'darts'         WHERE "slug" = 'rzutki';
UPDATE "EventDiscipline" SET "slug" = 'chess'         WHERE "slug" = 'szachy';
UPDATE "EventDiscipline" SET "slug" = 'table-tennis'  WHERE "slug" = 'tenis-stolowy';
-- Add missing disciplines (may already exist or not)
INSERT INTO "EventDiscipline" ("slug", "name") VALUES ('badminton', 'Badminton')    ON CONFLICT DO NOTHING;
INSERT INTO "EventDiscipline" ("slug", "name") VALUES ('squash', 'Squash')       ON CONFLICT DO NOTHING;

-- ─── EventFacility slugs ─────────────────────────────────────────────────────
-- Update FK references in Event
UPDATE "Event" SET "facilitySlug" = 'sports-hall'       WHERE "facilitySlug" = 'hala-sportowa';
UPDATE "Event" SET "facilitySlug" = 'balloon'           WHERE "facilitySlug" = 'balon';
UPDATE "Event" SET "facilitySlug" = 'synthetic-pitch'   WHERE "facilitySlug" = 'boisko-syntetyczne';
UPDATE "Event" SET "facilitySlug" = 'grass-pitch'       WHERE "facilitySlug" = 'boisko-trawiaste';
UPDATE "Event" SET "facilitySlug" = 'stadium'           WHERE "facilitySlug" = 'stadion';
UPDATE "Event" SET "facilitySlug" = 'gym'               WHERE "facilitySlug" = 'silownia';
UPDATE "Event" SET "facilitySlug" = 'pool'              WHERE "facilitySlug" = 'basen';
UPDATE "Event" SET "facilitySlug" = 'beach'             WHERE "facilitySlug" = 'plaza';

-- Rename EventFacility PKs
UPDATE "EventFacility" SET "slug" = 'sports-hall'       WHERE "slug" = 'hala-sportowa';
UPDATE "EventFacility" SET "slug" = 'balloon'           WHERE "slug" = 'balon';
UPDATE "EventFacility" SET "slug" = 'synthetic-pitch'   WHERE "slug" = 'boisko-syntetyczne';
UPDATE "EventFacility" SET "slug" = 'grass-pitch'       WHERE "slug" = 'boisko-trawiaste';
UPDATE "EventFacility" SET "slug" = 'stadium'           WHERE "slug" = 'stadion';
UPDATE "EventFacility" SET "slug" = 'gym'               WHERE "slug" = 'silownia';
UPDATE "EventFacility" SET "slug" = 'pool'              WHERE "slug" = 'basen';
UPDATE "EventFacility" SET "slug" = 'beach'             WHERE "slug" = 'plaza';
-- Add missing facilities
INSERT INTO "EventFacility" ("slug", "name") VALUES ('gym', 'Gym')    ON CONFLICT DO NOTHING;
INSERT INTO "EventFacility" ("slug", "name") VALUES ('pool', 'Pool')   ON CONFLICT DO NOTHING;
INSERT INTO "EventFacility" ("slug", "name") VALUES ('park', 'Park')   ON CONFLICT DO NOTHING;
INSERT INTO "EventFacility" ("slug", "name") VALUES ('beach', 'Beach')  ON CONFLICT DO NOTHING;

-- ─── EventLevel slugs ────────────────────────────────────────────────────────
-- Update FK references in Event
UPDATE "Event" SET "levelSlug" = 'mixed-open'    WHERE "levelSlug" = 'mieszany-open';
UPDATE "Event" SET "levelSlug" = 'beginner'      WHERE "levelSlug" = 'poczatkujacy';
UPDATE "Event" SET "levelSlug" = 'recreational'  WHERE "levelSlug" = 'rekreacyjny';
UPDATE "Event" SET "levelSlug" = 'regular'       WHERE "levelSlug" = 'regularny';
UPDATE "Event" SET "levelSlug" = 'solid'         WHERE "levelSlug" = 'solidny';
UPDATE "Event" SET "levelSlug" = 'advanced'      WHERE "levelSlug" = 'zaawansowany';
UPDATE "Event" SET "levelSlug" = 'professional'  WHERE "levelSlug" = 'zawodowy';

-- Rename EventLevel PKs
UPDATE "EventLevel" SET "slug" = 'mixed-open'    WHERE "slug" = 'mieszany-open';
UPDATE "EventLevel" SET "slug" = 'beginner'      WHERE "slug" = 'poczatkujacy';
UPDATE "EventLevel" SET "slug" = 'recreational'  WHERE "slug" = 'rekreacyjny';
UPDATE "EventLevel" SET "slug" = 'regular'       WHERE "slug" = 'regularny';
UPDATE "EventLevel" SET "slug" = 'solid'         WHERE "slug" = 'solidny';
UPDATE "EventLevel" SET "slug" = 'advanced'      WHERE "slug" = 'zaawansowany';
UPDATE "EventLevel" SET "slug" = 'professional'  WHERE "slug" = 'zawodowy';

-- ─── Drop name columns ────────────────────────────────────────────────────────
ALTER TABLE "EventDiscipline" DROP COLUMN IF EXISTS "name";
ALTER TABLE "EventFacility" DROP COLUMN IF EXISTS "name";
ALTER TABLE "EventLevel" DROP COLUMN IF EXISTS "name";
