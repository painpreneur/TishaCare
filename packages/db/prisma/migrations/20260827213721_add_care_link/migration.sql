-- CreateTable
CREATE TABLE "CareLink" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "managedByClinic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareLink_patientId_idx" ON "CareLink"("patientId");

-- CreateIndex
CREATE INDEX "CareLink_doctorId_idx" ON "CareLink"("doctorId");

-- CreateIndex
CREATE INDEX "CareLink_status_idx" ON "CareLink"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CareLink_patientId_doctorId_key" ON "CareLink"("patientId", "doctorId");

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareLink" ADD CONSTRAINT "CareLink_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: existing single-doctor links (Patient.doctorId) become active CareLinks.
INSERT INTO "CareLink" ("id", "patientId", "doctorId", "status", "requestedBy", "managedByClinic", "createdAt", "updatedAt", "activatedAt")
SELECT gen_random_uuid()::text, "id", "doctorId", 'active', 'doctor', false, "createdAt", now(), "createdAt"
FROM "Patient"
WHERE "doctorId" IS NOT NULL;
