-- NOT NULL na Event.coverImageId.
-- Uruchamiana przez deploy-r2-migration.sh po backfillu eventów.
-- Idempotentna w Postgres: SET NOT NULL na kolumnie już NOT NULL jest no-op.

ALTER TABLE "Event" ALTER COLUMN "coverImageId" SET NOT NULL;
