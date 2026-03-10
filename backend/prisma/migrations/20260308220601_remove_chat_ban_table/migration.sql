/*
  Warnings:

  - You are about to drop the `ChatBan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatBan" DROP CONSTRAINT "ChatBan_bannedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "ChatBan" DROP CONSTRAINT "ChatBan_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ChatBan" DROP CONSTRAINT "ChatBan_userId_fkey";

-- DropTable
DROP TABLE "ChatBan";
