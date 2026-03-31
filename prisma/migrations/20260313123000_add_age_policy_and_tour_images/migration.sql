ALTER TABLE "Tour"
ADD COLUMN "minAgeLimit" INTEGER,
ADD COLUMN "ageRestrictionEn" TEXT,
ADD COLUMN "ageRestrictionTr" TEXT,
ADD COLUMN "ageRestrictionZh" TEXT;

CREATE TABLE "ProductAgeGroup" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "minAge" INTEGER NOT NULL,
  "maxAge" INTEGER NOT NULL,
  "pricingType" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "descriptionTr" TEXT NOT NULL,
  "descriptionZh" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAgeGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourImage" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "altEn" TEXT,
  "altTr" TEXT,
  "altZh" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TourImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductAgeGroup_tourId_sortOrder_idx" ON "ProductAgeGroup"("tourId", "sortOrder");
CREATE INDEX "TourImage_tourId_sortOrder_idx" ON "TourImage"("tourId", "sortOrder");

ALTER TABLE "ProductAgeGroup"
ADD CONSTRAINT "ProductAgeGroup_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TourImage"
ADD CONSTRAINT "TourImage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default age policy migration for existing products
INSERT INTO "ProductAgeGroup" ("id", "tourId", "minAge", "maxAge", "pricingType", "descriptionEn", "descriptionTr", "descriptionZh", "sortOrder")
SELECT
  t."id" || '-default-age-' || v."sortOrder"::text,
  t."id",
  v."minAge",
  v."maxAge",
  v."pricingType",
  v."descriptionEn",
  v."descriptionTr",
  v."descriptionZh",
  v."sortOrder"
FROM "Tour" t
CROSS JOIN (
  VALUES
    (0, 3, 'free', 'Free of charge', 'Ücretsiz', '免费', 0),
    (4, 7, 'child', 'Child price applies', 'Çocuk fiyatı uygulanır', '儿童价格适用', 1),
    (8, 99, 'adult', 'Adult price applies', 'Yetişkin fiyatı uygulanır', '成人价格适用', 2)
) AS v("minAge","maxAge","pricingType","descriptionEn","descriptionTr","descriptionZh","sortOrder");
