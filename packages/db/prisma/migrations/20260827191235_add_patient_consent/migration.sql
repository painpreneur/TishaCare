-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT;
