-- CreateTable
CREATE TABLE "PatientMilestone" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientMilestone_patientId_idx" ON "PatientMilestone"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientMilestone_patientId_stage_key" ON "PatientMilestone"("patientId", "stage");

-- AddForeignKey
ALTER TABLE "PatientMilestone" ADD CONSTRAINT "PatientMilestone_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
