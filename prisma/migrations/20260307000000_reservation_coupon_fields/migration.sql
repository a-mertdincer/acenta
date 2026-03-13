-- Rezervasyona kupon alanları ekle (indirim bilgisi kalıcı olsun)
ALTER TABLE "Reservation" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "originalPrice" DOUBLE PRECISION;
ALTER TABLE "Reservation" ADD COLUMN "discountAmount" DOUBLE PRECISION DEFAULT 0;
