import { prisma } from "@tishacare/db";
import { describeDam, newlyReachedStages } from "@/lib/gamification";
import { newlyUnlocked, unlockContext } from "@/lib/unlocks";

// After a qualifying write (check-in, questionnaire submit, medication report,
// anamnesis update) bring the derived progress up to date:
//   - freeze any newly reached "Плотина Тиши" stages (PatientMilestone), and
//   - record any newly earned "Открытия" (PatientUnlock).
// Both are pure functions of the patient's acts (lib/gamification.ts,
// lib/unlocks.ts); these tables only remember WHEN each was first earned, for
// the timeline and the one-time cards. Idempotent via @@unique + skipDuplicates.
//
// Best-effort: wrapped so this bookkeeping can never break the write it follows.
export async function recordPatientProgress(patientId: string): Promise<void> {
  try {
    const [checkIns, responses, medReports, patient, milestones, unlocks, doneEncounters] =
      await Promise.all([
        prisma.checkIn.findMany({ where: { patientId }, select: { date: true } }),
        prisma.questionnaireResponse.findMany({
          where: { patientId },
          select: { completedAt: true, questionnaire: { select: { code: true } } },
        }),
        prisma.medicationReport.findMany({ where: { patientId }, select: { date: true } }),
        prisma.patient.findUnique({ where: { id: patientId }, select: { anamnesisUpdatedAt: true } }),
        prisma.patientMilestone.findMany({ where: { patientId }, select: { stage: true } }),
        prisma.patientUnlock.findMany({ where: { patientId }, select: { code: true } }),
        prisma.encounter.count({ where: { patientId, status: "done" } }),
      ]);

    const responseDates = responses.map((r) => ({ completedAt: r.completedAt }));
    const otherDates: Date[] = [
      ...medReports.map((m) => m.date),
      ...(patient?.anamnesisUpdatedAt ? [patient.anamnesisUpdatedAt] : []),
    ];

    // milestones
    const maxStage = milestones.reduce((m, r) => Math.max(m, r.stage), 0);
    const stages = newlyReachedStages(checkIns, responseDates, otherDates, maxStage);
    if (stages.length > 0) {
      await prisma.patientMilestone.createMany({
        data: stages.map((stage) => ({ patientId, stage })),
        skipDuplicates: true,
      });
    }

    // unlocks
    const snapshot = describeDam(checkIns, responseDates, otherDates);
    const ctx = unlockContext(
      responses.map((r) => r.questionnaire.code),
      snapshot,
      { hasCompletedEncounter: doneEncounters > 0 },
    );
    const codes = newlyUnlocked(
      ctx,
      unlocks.map((u) => u.code),
    );
    if (codes.length > 0) {
      await prisma.patientUnlock.createMany({
        data: codes.map((code) => ({ patientId, code })),
        skipDuplicates: true,
      });
    }
  } catch {
    // never let progress bookkeeping break the actual write
  }
}
