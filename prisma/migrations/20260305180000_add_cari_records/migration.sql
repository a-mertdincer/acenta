-- CreateTable
CREATE TABLE "CariRecord" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "guestName" TEXT NOT NULL,
    "hotelName" TEXT,
    "roomNumber" TEXT,
    "activityType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "saleCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "costAmount" DOUBLE PRECISION,
    "costCurrency" TEXT,
    "costDescription" TEXT,
    "agentName" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "paymentDestination" TEXT NOT NULL DEFAULT 'internal',
    "salesperson" TEXT,
    "paidToAgency" TEXT,
    "reservationConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmationReceived" BOOLEAN NOT NULL DEFAULT false,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "profit" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CariRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CariRecord_reservationId_idx" ON "CariRecord"("reservationId");
CREATE INDEX "CariRecord_activityDate_idx" ON "CariRecord"("activityDate");

-- AddForeignKey
ALTER TABLE "CariRecord" ADD CONSTRAINT "CariRecord_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
