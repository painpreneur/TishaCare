-- DropForeignKey
ALTER TABLE "Doctor" DROP CONSTRAINT "Doctor_clinicId_fkey";

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "practiceType" TEXT NOT NULL DEFAULT 'clinic',
ALTER COLUMN "clinicId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
