-- AlterTable
ALTER TABLE "Thought" ADD COLUMN     "emotions" TEXT,
ADD COLUMN     "intensity" INTEGER,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "reframe" TEXT,
ADD COLUMN     "situation" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Thought_patientId_idx" ON "Thought"("patientId");
