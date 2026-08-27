import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { toWellbeingSeries } from "@/lib/wellbeing";

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

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId: auth.patientId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ days, series: toWellbeingSeries(checkIns) });
}
