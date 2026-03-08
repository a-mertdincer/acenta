-- AlterTable
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "hasTourType" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "hasAirportSelect" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex (unique slug)
CREATE UNIQUE INDEX IF NOT EXISTS "Tour_slug_key" ON "Tour"("slug") WHERE "slug" IS NOT NULL;

-- CreateTable TourVariant
CREATE TABLE "TourVariant" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "tourType" TEXT,
    "reservationType" TEXT NOT NULL,
    "airport" TEXT,
    "titleEn" TEXT NOT NULL,
    "titleTr" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "descTr" TEXT NOT NULL,
    "descZh" TEXT NOT NULL,
    "includes" JSONB NOT NULL,
    "excludes" JSONB NOT NULL,
    "duration" TEXT,
    "languages" JSONB,
    "vehicleType" TEXT,
    "maxGroupSize" INTEGER,
    "routeStops" JSONB,
    "adultPrice" DOUBLE PRECISION NOT NULL,
    "childPrice" DOUBLE PRECISION,
    "pricingType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable Flight
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "airport" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- AlterTable Reservation: add variantId and transfer/child fields
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "transferDirection" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "transferFlightArrival" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "transferFlightDeparture" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "transferHotelName" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "childCount" INTEGER;

-- AddForeignKey
ALTER TABLE "TourVariant" ADD CONSTRAINT "TourVariant_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "TourVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
