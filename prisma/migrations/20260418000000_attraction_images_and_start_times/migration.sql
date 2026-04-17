-- AlterTable: Tour.startTimes
ALTER TABLE "Tour" ADD COLUMN "startTimes" JSONB;

-- AlterTable: Reservation.startTime
ALTER TABLE "Reservation" ADD COLUMN "startTime" TEXT;

-- CreateTable: AttractionImage
CREATE TABLE "AttractionImage" (
    "id" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altEn" TEXT,
    "altTr" TEXT,
    "altZh" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttractionImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttractionImage_attractionId_idx" ON "AttractionImage"("attractionId");

-- AddForeignKey
ALTER TABLE "AttractionImage" ADD CONSTRAINT "AttractionImage_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
