-- FAZA EXPAND wydzielenia pól REAL z User do UserRealDetails (Class Table Inheritance).
-- Patrz: docs/tasks/wydzielenie_typow_uzytkownikow.md
--
-- Tworzy tabelę 1:1. Kolumny REAL pozostają równolegle na User (dual-source)
-- aż do fazy CONTRACT (osobna migracja usuwająca je z User).
-- Backfill danych: prisma/data-migrations/20260611_backfill_user_real_details.ts
-- Idempotentna: IF NOT EXISTS / DO $$ block.

CREATE TABLE IF NOT EXISTS "UserRealDetails" (
  "userId"                      TEXT NOT NULL,
  "email"                       TEXT NOT NULL,
  "passwordHash"                TEXT,
  "isEmailVerified"             BOOLEAN NOT NULL DEFAULT false,
  "activationToken"             TEXT,
  "activationTokenExpiresAt"    TIMESTAMP(3),
  "passwordResetToken"          TEXT,
  "passwordResetTokenExpiresAt" TIMESTAMP(3),
  "tpayMerchantId"              TEXT,
  "donationUrl"                 TEXT,
  "weeklyDigestSentAt"          TIMESTAMP(3),
  "welcomeMessage"              TEXT,
  "welcomeMessageEnabled"       BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "UserRealDetails_pkey" PRIMARY KEY ("userId")
);

-- Unikalność email wśród kont REAL (kopiowane z User.email, które już jest @unique)
CREATE UNIQUE INDEX IF NOT EXISTS "UserRealDetails_email_key" ON "UserRealDetails"("email");

-- FK: userId -> User (cascade delete gdy user usunięty)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserRealDetails_userId_fkey'
  ) THEN
    ALTER TABLE "UserRealDetails"
      ADD CONSTRAINT "UserRealDetails_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
