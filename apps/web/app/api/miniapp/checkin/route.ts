import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient, resolveConsentedPatient } from "@/lib/telegramAuth";
import { STATE_TAG_IDS, NOTE_MAX_LENGTH } from "@/lib/checkin";
import { recordPatientProgress } from "@/lib/patientProgress";

const MEDS_VALUES = ["yes", "no", "partial"];

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId: auth.patientId },
    orderBy: { date: "desc" },
    take: 20,
  });

  return NextResponse.json({ checkIns });
}

export async function POST(req: NextRequest) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { mood, sleepHours, energyLevel, medsStatus, note } = body;

  if (!Number.isInteger(mood) || mood < -2 || mood > 2) {
    return NextResponse.json({ error: "Некорректное настроение" }, { status: 400 });
  }
  if (sleepHours != null && (typeof sleepHours !== "number" || sleepHours < 0 || sleepHours > 24)) {
    return NextResponse.json({ error: "Некорректное количество часов сна" }, { status: 400 });
  }
  if (energyLevel != null && (!Number.isInteger(energyLevel) || energyLevel < 1 || energyLevel > 5)) {
    return NextResponse.json({ error: "Некорректный уровень энергии" }, { status: 400 });
  }
  if (medsStatus != null && !MEDS_VALUES.includes(medsStatus)) {
    return NextResponse.json({ error: "Некорректный ответ про лекарства" }, { status: 400 });
  }

  const rawTags = Array.isArray(body.stateTags) ? body.stateTags : [];
  const tags = [...new Set(rawTags)].filter((t): t is string => typeof t === "string" && STATE_TAG_IDS.includes(t));

  const trimmedNote = typeof note === "string" ? note.trim().slice(0, NOTE_MAX_LENGTH) : "";

  const checkIn = await prisma.checkIn.create({
    data: {
      patientId: auth.patientId,
      mood,
      stateTags: tags.length ? JSON.stringify(tags) : null,
      note: trimmedNote || null,
      sleepHours: sleepHours ?? null,
      energyLevel: energyLevel ?? null,
      medsStatus: medsStatus ?? null,
    },
  });

  await recordPatientProgress(auth.patientId);

  return NextResponse.json({ ok: true, checkIn });
}
