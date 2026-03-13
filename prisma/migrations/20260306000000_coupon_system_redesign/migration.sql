-- Kupon sistemi yeniden tasarımı
-- 1. Coupon tablosuna yeni sütunlar
ALTER TABLE "Coupon" ADD COLUMN "discountType" TEXT DEFAULT 'percentage';
ALTER TABLE "Coupon" ADD COLUMN "discountValue" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Coupon" ADD COLUMN "discountCurrency" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "bookingStart" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "bookingEnd" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "activityStart" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "activityEnd" TIMESTAMP(3);
ALTER TABLE "Coupon" ADD COLUMN "usageLimit" INTEGER DEFAULT 0;
ALTER TABLE "Coupon" ADD COLUMN "usageCount" INTEGER DEFAULT 0;
ALTER TABLE "Coupon" ADD COLUMN "applicableCategories" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "minCartAmount" DOUBLE PRECISION;
ALTER TABLE "Coupon" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "createdBy" TEXT;

-- 2. Mevcut kuponları migrate et (varsayılan tarihler: bugünden 1 yıl sonrasına kadar)
UPDATE "Coupon"
SET
  "discountType" = CASE WHEN "discountPct" IS NOT NULL AND "discountPct" > 0 THEN 'percentage' ELSE 'fixed' END,
  "discountValue" = COALESCE("discountPct", "discountAbs", 0),
  "discountCurrency" = CASE WHEN "discountPct" IS NULL OR "discountPct" = 0 THEN 'EUR' ELSE NULL END,
  "bookingStart" = COALESCE(DATE_TRUNC('day', "createdAt")::timestamp, CURRENT_TIMESTAMP),
  "bookingEnd" = COALESCE(
    CASE WHEN "validUntil" IS NOT NULL AND "validUntil" > CURRENT_TIMESTAMP THEN "validUntil" ELSE NULL END,
    CURRENT_TIMESTAMP + INTERVAL '1 year'
  ),
  "activityStart" = COALESCE(DATE_TRUNC('day', "createdAt")::timestamp, CURRENT_TIMESTAMP),
  "activityEnd" = COALESCE(
    CASE WHEN "validUntil" IS NOT NULL AND "validUntil" > CURRENT_TIMESTAMP THEN "validUntil" ELSE NULL END,
    CURRENT_TIMESTAMP + INTERVAL '1 year'
  ),
  "usageLimit" = COALESCE("usageLimit", 0),
  "usageCount" = COALESCE("usageCount", 0)
WHERE "bookingStart" IS NULL OR "bookingEnd" IS NULL OR "activityStart" IS NULL OR "activityEnd" IS NULL;

-- 3. NOT NULL constraint (eğer hala NULL varsa varsayılan ata)
UPDATE "Coupon" SET "bookingStart" = COALESCE("bookingStart", CURRENT_TIMESTAMP) WHERE "bookingStart" IS NULL;
UPDATE "Coupon" SET "bookingEnd" = COALESCE("bookingEnd", CURRENT_TIMESTAMP + INTERVAL '1 year') WHERE "bookingEnd" IS NULL;
UPDATE "Coupon" SET "activityStart" = COALESCE("activityStart", CURRENT_TIMESTAMP) WHERE "activityStart" IS NULL;
UPDATE "Coupon" SET "activityEnd" = COALESCE("activityEnd", CURRENT_TIMESTAMP + INTERVAL '1 year') WHERE "activityEnd" IS NULL;

ALTER TABLE "Coupon" ALTER COLUMN "discountType" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "discountValue" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "bookingStart" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "bookingEnd" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "activityStart" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "activityEnd" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "usageLimit" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "usageCount" SET NOT NULL;

-- 4. Reservation'a couponId ekle
ALTER TABLE "Reservation" ADD COLUMN "couponId" TEXT;

-- 5. CouponUsage tablosu
CREATE TABLE IF NOT EXISTS "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "reservationId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tourName" TEXT NOT NULL,
    "tourDate" TIMESTAMP(3) NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");
CREATE INDEX IF NOT EXISTS "CouponUsage_reservationId_idx" ON "CouponUsage"("reservationId");

ALTER TABLE "CouponUsage" DROP CONSTRAINT IF EXISTS "CouponUsage_couponId_fkey";
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
