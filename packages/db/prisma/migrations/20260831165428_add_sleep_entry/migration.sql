-- CreateTable
CREATE TABLE "SleepEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bedtime" TEXT,
    "wakeTime" TEXT,
    "hours" DOUBLE PRECISION NOT NULL,
    "quality" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleepEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SleepEntry_patientId_date_key" ON "SleepEntry"("patientId", "date");

-- AddForeignKey
ALTER TABLE "SleepEntry" ADD CONSTRAINT "SleepEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
