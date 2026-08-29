import { prisma } from "@tishacare/db";
import { newlyReachedStages } from "@/lib/gamification";

// After a qualifying write (check-in, questionnaire submit, medication report,
// anamnesis update) freeze any newly reached "Плотина Тиши" stages. The stage
// itself is always derived (lib/gamification.ts); PatientMilestone only records
// WHEN each stage was first crossed, for the /progress timeline and the
// one-time milestone card.
//
// Best-effort: wrapped so milestone bookkeeping can never break the write it
// follows. Idempotent via @@unique(patientId, stage) + skipDuplicates.
export async function recordDamMilestones(patientId: string): Promise<void> {
  try {
    const [checkIns, responses, medReports, patient, existing] = await Promise.all([
      prisma.checkIn.findMany({ where: { patientId }, select: { date: true } }),
      prisma.questionnaireResponse.findMany({ where: { patientId }, select: { completedAt: true } }),
      prisma.medicationReport.findMany({ where: { patientId }, select: { date: true } }),
      prisma.patient.findUnique({ where: { id: patientId }, select: { anamnesisUpdatedAt: true } }),
      prisma.patientMilestone.findMany({ where: { patientId }, select: { stage: true } }),
    ]);

    const otherDates: Date[] = [
      ...medReports.map((m) => m.date),
      ...(patient?.anamnesisUpdatedAt ? [patient.anamnesisUpdatedAt] : []),
    ];
    const maxRecorded = existing.reduce((m, r) => Math.max(m, r.stage), 0);
    const toAdd = newlyReachedStages(checkIns, responses, otherDates, maxRecorded);
    if (toAdd.length === 0) return;

    await prisma.patientMilestone.createMany({
      data: toAdd.map((stage) => ({ patientId, stage })),
      skipDuplicates: true,
    });
  } catch {
    // never let milestone bookkeeping break the actual write
  }
}
