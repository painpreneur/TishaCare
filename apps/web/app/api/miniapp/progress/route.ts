import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { toWellbeingSeries } from "@/lib/wellbeing";
import { buildQuestionnaireSeries } from "@/lib/questionnaireSeries";
import { buildConnections } from "@/lib/connections";
import { buildBalanceHistory } from "@/lib/balanceHistory";
import { buildWeekRhythm } from "@/lib/weekRhythm";
import { buildYearCompare } from "@/lib/yearCompare";
import { buildBaseline } from "@/lib/baseline";

const ALLOWED_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const requested = Number(req.nextUrl.searchParams.get("days"));
  const days = ALLOWED_DAYS.includes(requested) ? requested : DEFAULT_DAYS;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [checkIns, responses, unlocks, sleepEntries] = await Promise.all([
    // all check-ins; the wellbeing chart uses the `days` window, "Связи" uses
    // the full history (Pearson needs enough points).
    prisma.checkIn.findMany({
      where: { patientId: auth.patientId },
      orderBy: { date: "asc" },
    }),
    // Questionnaire responses are sparse (weeks apart), so they are not bound by
    // the `days` window — the score chart always shows the full history.
    prisma.questionnaireResponse.findMany({
      where: { patientId: auth.patientId },
      orderBy: { completedAt: "asc" },
      select: {
        score: true,
        completedAt: true,
        answers: true,
        questionnaire: { select: { code: true, title: true } },
      },
    }),
    prisma.patientUnlock.findMany({ where: { patientId: auth.patientId }, select: { code: true } }),
    prisma.sleepEntry.findMany({
      where: { patientId: auth.patientId },
      select: { date: true, hours: true },
    }),
  ]);

  const unlockedCodes = unlocks.map((u) => u.code);

  return NextResponse.json({
    days,
    series: toWellbeingSeries(
      checkIns.filter((c) => c.date >= since),
      sleepEntries.filter((s) => s.date >= since),
    ),
    questionnaires: buildQuestionnaireSeries(responses),
    unlocks: unlockedCodes,
    connections: unlockedCodes.includes("connections") ? buildConnections(checkIns) : null,
    balanceHistory: unlockedCodes.includes("balance") ? buildBalanceHistory(responses) : null,
    weekRhythm: unlockedCodes.includes("rhythm") ? buildWeekRhythm(checkIns) : null,
    yearCompare: unlockedCodes.includes("year") ? buildYearCompare(checkIns) : null,
    baseline: unlockedCodes.includes("baseline") ? buildBaseline(responses) : null,
  });
}
