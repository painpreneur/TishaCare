-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "prescriberDoctorId" TEXT,
ADD COLUMN     "prescriberType" TEXT NOT NULL DEFAULT 'self',
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "MedicationReport" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tolerability" INTEGER,
    "perceivedBenefit" INTEGER,
    "sideEffects" TEXT,
    "sideEffectTags" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicationReport_medicationId_idx" ON "MedicationReport"("medicationId");

-- CreateIndex
CREATE INDEX "Medication_patientId_idx" ON "Medication"("patientId");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_prescriberDoctorId_fkey" FOREIGN KEY ("prescriberDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationReport" ADD CONSTRAINT "MedicationReport_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationReport" ADD CONSTRAINT "MedicationReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill: existing rows started when they were created.
UPDATE "Medication" SET "startedAt" = "createdAt";
