-- FAZA CONTRACT wydzielenia pól REAL z User do UserRealDetails (Class Table Inheritance).
-- Patrz: docs/tasks/wydzielenie_typow_uzytkownikow.md
--
-- Kolejność w tej migracji jest istotna i prod-safe:
--   1. backfill (idempotentny INSERT ... SELECT ... ON CONFLICT DO NOTHING) — gwarantuje,
--      że dane REAL są w UserRealDetails ZANIM usuniemy kolumny z User. Łapie też konta
--      REAL utworzone w oknie między migracją tworzącą tabelę a tą migracją.
--   2. DROP przeniesionych kolumn z User.
--
-- Idempotentna: ON CONFLICT DO NOTHING + DROP COLUMN IF EXISTS.

-- 1. Backfill (zabezpieczenie przed utratą danych)
INSERT INTO "UserRealDetails" (
  "userId",
  "email",
  "passwordHash",
  "isEmailVerified",
  "activationToken",
  "activationTokenExpiresAt",
  "passwordResetToken",
  "passwordResetTokenExpiresAt",
  "tpayMerchantId",
  "donationUrl",
  "weeklyDigestSentAt",
  "welcomeMessage",
  "welcomeMessageEnabled"
)
SELECT
  "id",
  "email",
  "passwordHash",
  "isEmailVerified",
  "activationToken",
  "activationTokenExpiresAt",
  "passwordResetToken",
  "passwordResetTokenExpiresAt",
  "tpayMerchantId",
  "donationUrl",
  "weeklyDigestSentAt",
  "welcomeMessage",
  "welcomeMessageEnabled"
FROM "User"
WHERE "accountType" = 'REAL'
ON CONFLICT ("userId") DO NOTHING;

-- 2. DROP przeniesionych kolumn z User (unikalny indeks email znika razem z kolumną)
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isEmailVerified";
ALTER TABLE "User" DROP COLUMN IF EXISTS "activationToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "activationTokenExpiresAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordResetToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordResetTokenExpiresAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "tpayMerchantId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "donationUrl";
ALTER TABLE "User" DROP COLUMN IF EXISTS "weeklyDigestSentAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "welcomeMessage";
ALTER TABLE "User" DROP COLUMN IF EXISTS "welcomeMessageEnabled";
