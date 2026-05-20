-- AlterTable: make userId optional and add email field
ALTER TABLE "CitySubscription" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "CitySubscription" ADD COLUMN "email" TEXT;

-- CreateIndex: unique constraint on [email, citySlug]
CREATE UNIQUE INDEX "CitySubscription_email_citySlug_key" ON "CitySubscription"("email", "citySlug");

-- CreateIndex: index on email
CREATE INDEX "CitySubscription_email_idx" ON "CitySubscription"("email");
