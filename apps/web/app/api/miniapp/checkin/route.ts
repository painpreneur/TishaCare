import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@mindsteady/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId: auth.patientId },
    orderBy: { date: "desc" },
    take: 14,
  });

  return NextResponse.json({ checkIns });
}

export async function POST(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { mood, sleepHours, energyLevel, medsTaken } = await req.json();

  if (!Number.isInteger(mood) || mood < -2 || mood > 2) {
    return NextResponse.json({ error: "Некорректное настроение" }, { status: 400 });
  }
  if (sleepHours != null && (typeof sleepHours !== "number" || sleepHours < 0 || sleepHours > 24)) {
    return NextResponse.json({ error: "Некорректное количество часов сна" }, { status: 400 });
  }
  if (energyLevel != null && (!Number.isInteger(energyLevel) || energyLevel < 1 || energyLevel > 5)) {
    return NextResponse.json({ error: "Некорректный уровень энергии" }, { status: 400 });
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      patientId: auth.patientId,
      mood,
      sleepHours: sleepHours ?? null,
      energyLevel: energyLevel ?? null,
      medsTaken: medsTaken ?? null,
    },
  });

  return NextResponse.json({ ok: true, checkIn });
}
