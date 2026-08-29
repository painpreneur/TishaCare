import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { describeDam, welcomeBackLine } from "@/lib/gamification";

// Snapshot for the "Плотина Тиши" scene (DamScene): current stage, the calm
// status line, today's state, and the frozen milestone timeline. Read-only and
// derived — the stage itself is a pure function of the patient's qualifying
// entries (lib/gamification.ts); PatientMilestone only remembers when each
// stage was first reached.

type TodayState = "added" | "done" | "pending";

function dayKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }
  const patientId = auth.patientId;

  const [checkIns, responses, medReports, patient, milestones] = await Promise.all([
    prisma.checkIn.findMany({ where: { patientId }, select: { date: true, sleepHours: true } }),
    prisma.questionnaireResponse.findMany({ where: { patientId }, select: { completedAt: true } }),
    prisma.medicationReport.findMany({ where: { patientId }, select: { date: true } }),
    prisma.patient.findUnique({ where: { id: patientId }, select: { anamnesisUpdatedAt: true } }),
    prisma.patientMilestone.findMany({
      where: { patientId },
      orderBy: { stage: "asc" },
      select: { stage: true, reachedAt: true },
    }),
  ]);

  const otherDates: Date[] = [
    ...medReports.map((m) => m.date),
    ...(patient?.anamnesisUpdatedAt ? [patient.anamnesisUpdatedAt] : []),
  ];

  const snapshot = describeDam(
    checkIns.map((c) => ({ date: c.date })),
    responses,
    otherDates,
  );

  // today's state: nothing yet -> pending; a "moment" check-in -> added; a
  // check-in that carries the evening day-summary (sleepHours) -> done.
  const today = dayKey(new Date());
  const checkInsToday = checkIns.filter((c) => dayKey(c.date) === today);
  const otherToday =
    responses.some((r) => dayKey(r.completedAt) === today) ||
    otherDates.some((d) => dayKey(d) === today);
  let todayState: TodayState = "pending";
  if (checkInsToday.length > 0 || otherToday) {
    todayState = checkInsToday.some((c) => c.sleepHours != null) ? "done" : "added";
  }

  return NextResponse.json({
    stage: snapshot.stage,
    stageCode: snapshot.stageInfo.code,
    stageTitle: snapshot.stageInfo.title,
    statusLine: snapshot.statusLine,
    entriesLast30: snapshot.entriesLast30,
    entryCount: snapshot.entryCount,
    daysActive: snapshot.daysActive,
    todayState,
    welcomeBackLine: snapshot.welcomeBackDue ? welcomeBackLine() : null,
    milestones: milestones.map((m) => ({ stage: m.stage, reachedAt: m.reachedAt.toISOString() })),
  });
}
