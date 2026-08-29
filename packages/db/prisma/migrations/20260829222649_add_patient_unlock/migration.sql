-- CreateTable
CREATE TABLE "PatientUnlock" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientUnlock_patientId_idx" ON "PatientUnlock"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientUnlock_patientId_code_key" ON "PatientUnlock"("patientId", "code");

-- AddForeignKey
ALTER TABLE "PatientUnlock" ADD CONSTRAINT "PatientUnlock_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
