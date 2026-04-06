CREATE TABLE "Attraction" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameTr" TEXT NOT NULL,
  "nameZh" TEXT,
  "descriptionEn" TEXT,
  "descriptionTr" TEXT,
  "descriptionZh" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourAttraction" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "attractionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TourAttraction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attraction_slug_key" ON "Attraction"("slug");
CREATE UNIQUE INDEX "TourAttraction_tourId_attractionId_key" ON "TourAttraction"("tourId", "attractionId");

ALTER TABLE "TourAttraction"
ADD CONSTRAINT "TourAttraction_tourId_fkey"
FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TourAttraction"
ADD CONSTRAINT "TourAttraction_attractionId_fkey"
FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
