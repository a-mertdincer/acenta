ALTER TABLE "TourVariant"
ADD COLUMN IF NOT EXISTS "privatePriceTiers" JSONB;
