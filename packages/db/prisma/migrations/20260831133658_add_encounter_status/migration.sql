-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'done';

-- CreateIndex
CREATE INDEX "Encounter_doctorId_status_idx" ON "Encounter"("doctorId", "status");
