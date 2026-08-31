import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { computeSleepHours, isValidSleepTime, SLEEP_NOTE_MAX } from "@/lib/sleep";

function dto(e: {
  date: Date;
  bedtime: string | null;
  wakeTime: string | null;
  hours: number;
  quality: number | null;
  note: string | null;
}) {
  return {
    date: e.date.toISOString().slice(0, 10),
    bedtime: e.bedtime,
    wakeTime: e.wakeTime,
    hours: e.hours,
    quality: e.quality,
    note: e.note,
  };
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  if (value > new Date().toISOString().slice(0, 10)) return null; // no future nights
  return d;
}

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const entries = await prisma.sleepEntry.findMany({
    where: { patientId: auth.patientId },
    orderBy: { date: "desc" },
    take: 30,
  });
  return NextResponse.json({ entries: entries.map(dto) });
}

export async function PUT(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = parseDate(body.date);
  if (!date) return NextResponse.json({ error: "Укажите корректную дату" }, { status: 400 });

  const bedtime = isValidSleepTime(body.bedtime) ? body.bedtime : null;
  const wakeTime = isValidSleepTime(body.wakeTime) ? body.wakeTime : null;

  let hours = computeSleepHours(bedtime, wakeTime);
  if (hours == null && typeof body.hours === "number" && body.hours > 0 && body.hours <= 24) {
    hours = Math.round(body.hours * 10) / 10;
  }
  if (hours == null) {
    return NextResponse.json(
      { error: "Укажите время отхода ко сну и подъёма (или число часов)" },
      { status: 400 }
    );
  }

  const quality =
    Number.isInteger(body.quality) && body.quality >= 1 && body.quality <= 5 ? body.quality : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, SLEEP_NOTE_MAX) || null : null;

  const data = { bedtime, wakeTime, hours, quality, note };
  const entry = await prisma.sleepEntry.upsert({
    where: { patientId_date: { patientId: auth.patientId, date } },
    create: { patientId: auth.patientId, date, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, entry: dto(entry) });
}

export async function DELETE(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const date = parseDate(req.nextUrl.searchParams.get("date"));
  if (!date) return NextResponse.json({ error: "Укажите дату" }, { status: 400 });

  await prisma.sleepEntry
    .delete({ where: { patientId_date: { patientId: auth.patientId, date } } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
