ALTER TABLE "Tour"
ADD COLUMN "reservationTypeMode" TEXT NOT NULL DEFAULT 'private_regular';

UPDATE "Tour"
SET "reservationTypeMode" = 'none'
WHERE "hasReservationType" = false;
