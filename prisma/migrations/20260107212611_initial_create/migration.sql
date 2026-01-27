-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('User', 'Osnova', 'Ronin', 'Admin');

-- CreateEnum
CREATE TYPE "EquipmentAccess" AS ENUM ('User', 'Osnova', 'Ronin');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('Camera', 'Lens', 'Card', 'Battery', 'Charger', 'Sound', 'Stand', 'Light', 'Other');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('Pending', 'Cancelled', 'Approved', 'Completed');

-- CreateTable
CREATE TABLE "Users" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telegramChatId" BIGINT,
    "telegramUsername" TEXT,
    "telegramLinkCode" TEXT,
    "telegramLinkCodeExpiry" TIMESTAMP(3),
    "role" "UserRole" NOT NULL,
    "banned" BOOLEAN NOT NULL,
    "joinYear" INTEGER NOT NULL,
    "refreshToken" TEXT,
    "refreshTokenExpiryTime" TIMESTAMP(3),

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentModels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "access" "EquipmentAccess" NOT NULL,
    "attributesJson" TEXT NOT NULL,

    CONSTRAINT "EquipmentModels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentItems" (
    "id" SERIAL NOT NULL,
    "equipmentModelId" INTEGER NOT NULL,
    "inventoryNumber" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,

    CONSTRAINT "EquipmentItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "creationTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "warningsJson" TEXT NOT NULL,
    "comment" TEXT,
    "adminComment" TEXT,

    CONSTRAINT "Bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItems" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "equipmentItemId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isReturned" BOOLEAN NOT NULL,

    CONSTRAINT "BookingItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItems_inventoryNumber_key" ON "EquipmentItems"("inventoryNumber");

-- CreateIndex
CREATE INDEX "EquipmentItems_equipmentModelId_idx" ON "EquipmentItems"("equipmentModelId");

-- CreateIndex
CREATE INDEX "Bookings_userId_idx" ON "Bookings"("userId");

-- CreateIndex
CREATE INDEX "BookingItems_bookingId_idx" ON "BookingItems"("bookingId");

-- CreateIndex
CREATE INDEX "BookingItems_equipmentItemId_idx" ON "BookingItems"("equipmentItemId");

-- AddForeignKey
ALTER TABLE "EquipmentItems" ADD CONSTRAINT "EquipmentItems_equipmentModelId_fkey" FOREIGN KEY ("equipmentModelId") REFERENCES "EquipmentModels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookings" ADD CONSTRAINT "Bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItems" ADD CONSTRAINT "BookingItems_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItems" ADD CONSTRAINT "BookingItems_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
