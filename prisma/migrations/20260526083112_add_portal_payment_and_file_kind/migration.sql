-- CreateEnum
CREATE TYPE "PortalPaymentStatus" AS ENUM ('NONE', 'AWAITING', 'PAID');

-- CreateEnum
CREATE TYPE "PortalFileKind" AS ENUM ('DRAWING', 'DOCUMENT');

-- AlterTable
ALTER TABLE "PortalFile" ADD COLUMN     "kind" "PortalFileKind" NOT NULL DEFAULT 'DRAWING';

-- AlterTable
ALTER TABLE "PortalRequest" ADD COLUMN     "paymentStatus" "PortalPaymentStatus" NOT NULL DEFAULT 'NONE';
