-- DropIndex
DROP INDEX "CouponUsage_couponId_idx";

-- DropIndex
DROP INDEX "CouponUsage_reservationId_idx";

-- DropIndex
DROP INDEX "ProductAgeGroup_tourId_sortOrder_idx";

-- DropIndex
DROP INDEX "TourImage_tourId_sortOrder_idx";

-- AlterTable
ALTER TABLE "ProductAgeGroup" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "cancelReason" SET DATA TYPE TEXT,
ALTER COLUMN "cancelledBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TourImage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TourOption" ALTER COLUMN "pricingMode" SET DATA TYPE TEXT;
