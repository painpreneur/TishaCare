import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { LIFE_AREAS, BALANCE_WHEEL_CODE } from "@tishacare/db/client";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

// The patient's most recent "Колесо баланса" run, so LifeBalanceWheel can open
// on the last values (with a faint "before" layer) instead of a flat 5. Not
// gated by the `balance` unlock — pre-filling is just sensible, the unlock only
// governs the history/compare view on "Моя динамика".

function parseValues(answers: string): number[] | null {
  try {
    const p = JSON.parse(answers);
    const raw = Array.isArray(p) ? p : p?.submission;
    if (!Array.isArray(raw) || raw.length < LIFE_AREAS.length) return null;
    return LIFE_AREAS.map((_, i) => {
      const n = Math.round(Number(raw[i]));
      return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 5;
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const last = await prisma.questionnaireResponse.findFirst({
    where: { patientId: auth.patientId, questionnaire: { code: BALANCE_WHEEL_CODE } },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true, answers: true },
  });

  const values = last ? parseValues(last.answers) : null;

  return NextResponse.json({
    last: values ? { values, date: last!.completedAt.toISOString() } : null,
  });
}
