-- AlterTable
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "transferAirportTiers" JSONB;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "transferAirport" TEXT;
