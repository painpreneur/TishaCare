-- CreateTable
CREATE TABLE "ClinicInvite" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "ClinicInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicInvite_token_key" ON "ClinicInvite"("token");

-- CreateIndex
CREATE INDEX "ClinicInvite_clinicId_idx" ON "ClinicInvite"("clinicId");

-- AddForeignKey
ALTER TABLE "ClinicInvite" ADD CONSTRAINT "ClinicInvite_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
