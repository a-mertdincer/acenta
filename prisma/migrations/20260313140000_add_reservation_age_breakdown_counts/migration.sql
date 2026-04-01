ALTER TABLE "Reservation"
ADD COLUMN "adultCount" INTEGER,
ADD COLUMN "infantCount" INTEGER;

UPDATE "Reservation"
SET "adultCount" = GREATEST(COALESCE("pax", 1) - COALESCE("childCount", 0), 1)
WHERE "adultCount" IS NULL;

UPDATE "Reservation"
SET "infantCount" = 0
WHERE "infantCount" IS NULL;
