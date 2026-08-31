-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "checkinReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reengagedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SafetyPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "warningSigns" TEXT,
    "copingSteps" TEXT,
    "contacts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyPlan_patientId_key" ON "SafetyPlan"("patientId");

-- AddForeignKey
ALTER TABLE "SafetyPlan" ADD CONSTRAINT "SafetyPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
