-- AlterTable
ALTER TABLE "OrganizerVoucher" ADD COLUMN     "sourcePaymentId" TEXT;

-- AddForeignKey
ALTER TABLE "OrganizerVoucher" ADD CONSTRAINT "OrganizerVoucher_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
