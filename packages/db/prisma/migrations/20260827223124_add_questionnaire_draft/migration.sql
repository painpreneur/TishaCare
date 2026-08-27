-- CreateTable
CREATE TABLE "QuestionnaireDraft" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "questionnaireCode" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '[]',
    "lastIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireDraft_patientId_questionnaireCode_key" ON "QuestionnaireDraft"("patientId", "questionnaireCode");

-- AddForeignKey
ALTER TABLE "QuestionnaireDraft" ADD CONSTRAINT "QuestionnaireDraft_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

