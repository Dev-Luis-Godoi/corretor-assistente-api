CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'RURAL', 'OTHER');
CREATE TYPE "PropertyPurpose" AS ENUM ('SALE', 'RENT');
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'INACTIVE');

CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reference" TEXT,
  "description" TEXT,
  "type" "PropertyType" NOT NULL,
  "purpose" "PropertyPurpose" NOT NULL,
  "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
  "price" DECIMAL(14,2) NOT NULL,
  "condominiumFee" DECIMAL(12,2),
  "propertyTax" DECIMAL(12,2),
  "areaM2" DECIMAL(10,2),
  "bedrooms" INTEGER NOT NULL DEFAULT 0,
  "suites" INTEGER NOT NULL DEFAULT 0,
  "bathrooms" INTEGER NOT NULL DEFAULT 0,
  "parkingSpots" INTEGER NOT NULL DEFAULT 0,
  "address" TEXT,
  "neighborhood" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "zipCode" TEXT,
  "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyPhoto" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Property_organizationId_reference_key" ON "Property"("organizationId", "reference");
CREATE INDEX "Property_organizationId_status_idx" ON "Property"("organizationId", "status");
CREATE INDEX "Property_organizationId_type_purpose_idx" ON "Property"("organizationId", "type", "purpose");
CREATE INDEX "Property_organizationId_updatedAt_idx" ON "Property"("organizationId", "updatedAt");
CREATE UNIQUE INDEX "PropertyPhoto_objectKey_key" ON "PropertyPhoto"("objectKey");
CREATE INDEX "PropertyPhoto_propertyId_position_idx" ON "PropertyPhoto"("propertyId", "position");

ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
