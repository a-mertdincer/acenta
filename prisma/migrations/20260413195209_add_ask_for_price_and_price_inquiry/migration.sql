-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "isAskForPrice" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PriceInquiry" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT,
    "preferredDate" TEXT,
    "people" INTEGER NOT NULL,
    "hotelOrCruise" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceInquiry_tourId_idx" ON "PriceInquiry"("tourId");

-- AddForeignKey
ALTER TABLE "PriceInquiry" ADD CONSTRAINT "PriceInquiry_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
