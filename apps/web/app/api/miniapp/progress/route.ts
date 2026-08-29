import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { toWellbeingSeries } from "@/lib/wellbeing";
import { buildQuestionnaireSeries } from "@/lib/questionnaireSeries";

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

  const [checkIns, responses] = await Promise.all([
    prisma.checkIn.findMany({
      where: { patientId: auth.patientId, date: { gte: since } },
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
  ]);

  return NextResponse.json({
    days,
    series: toWellbeingSeries(checkIns),
    questionnaires: buildQuestionnaireSeries(responses),
  });
}
