CREATE TYPE "PropertyAuthorizationStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'REFUSED');

ALTER TABLE "Property"
  ADD COLUMN "authorizationStatus" "PropertyAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "authorizationDate" TIMESTAMP(3),
  ADD COLUMN "authorizationNotes" TEXT,
  ADD COLUMN "exclusive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "exclusivityStartAt" TIMESTAMP(3),
  ADD COLUMN "exclusivityEndAt" TIMESTAMP(3),
  ADD COLUMN "authorizationDocumentName" TEXT,
  ADD COLUMN "authorizationDocumentObjectKey" TEXT,
  ADD COLUMN "authorizationDocumentMimeType" TEXT,
  ADD COLUMN "authorizationDocumentSizeBytes" INTEGER;

CREATE UNIQUE INDEX "Property_authorizationDocumentObjectKey_key"
  ON "Property"("authorizationDocumentObjectKey");
