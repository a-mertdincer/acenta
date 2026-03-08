/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Tour` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CariRecord_activityDate_idx";

-- DropIndex
DROP INDEX "CariRecord_reservationId_idx";

-- DropIndex
DROP INDEX "Tour_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");
