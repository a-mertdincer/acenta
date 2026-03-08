-- AlterTable: misafir iptal ve değişiklik talepleri (operasyon onayı gerekir)
ALTER TABLE "Reservation" ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN "cancellationRequestReason" TEXT,
ADD COLUMN "updateRequestedAt" TIMESTAMP(3),
ADD COLUMN "pendingDate" TIMESTAMP(3),
ADD COLUMN "pendingPax" INTEGER,
ADD COLUMN "pendingNotes" TEXT;
