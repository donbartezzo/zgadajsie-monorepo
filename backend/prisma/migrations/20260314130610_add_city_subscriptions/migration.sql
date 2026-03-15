-- CreateTable
CREATE TABLE "CitySubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CitySubscription_cityId_idx" ON "CitySubscription"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "CitySubscription_userId_cityId_key" ON "CitySubscription"("userId", "cityId");

-- AddForeignKey
ALTER TABLE "CitySubscription" ADD CONSTRAINT "CitySubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitySubscription" ADD CONSTRAINT "CitySubscription_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
