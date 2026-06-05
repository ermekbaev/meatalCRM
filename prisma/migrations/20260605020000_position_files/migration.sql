-- CreateTable
CREATE TABLE "ClientPositionFile" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'PDF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPositionFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientPositionFile_positionId_idx" ON "ClientPositionFile"("positionId");

-- AddForeignKey
ALTER TABLE "ClientPositionFile" ADD CONSTRAINT "ClientPositionFile_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "ClientPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing PDF data into new table
INSERT INTO "ClientPositionFile" ("id", "positionId", "filename", "originalName", "size", "kind", "createdAt")
SELECT
    gen_random_uuid()::text,
    id,
    "pdfKey",
    COALESCE("pdfName", 'document.pdf'),
    0,
    'PDF',
    "createdAt"
FROM "ClientPosition"
WHERE "pdfKey" IS NOT NULL;

-- Drop old columns
ALTER TABLE "ClientPosition" DROP COLUMN IF EXISTS "pdfKey";
ALTER TABLE "ClientPosition" DROP COLUMN IF EXISTS "pdfName";
