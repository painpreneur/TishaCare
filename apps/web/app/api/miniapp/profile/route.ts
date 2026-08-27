import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

const MIN_YEAR = 1920;

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: auth.patientId } });
  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  return NextResponse.json({
    name: patient.name,
    birthYear: patient.birthDate ? patient.birthDate.getUTCFullYear() : null,
    inviteCode: patient.inviteCode,
    doctorConnected: Boolean(patient.doctorId),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { name, birthYear } = await req.json();
  const currentYear = new Date().getFullYear();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Введите имя" }, { status: 400 });
  }
  if (!Number.isInteger(birthYear) || birthYear < MIN_YEAR || birthYear > currentYear) {
    return NextResponse.json({ error: `Введите корректный год рождения (${MIN_YEAR}–${currentYear})` }, { status: 400 });
  }

  const patient = await prisma.patient.update({
    where: { id: auth.patientId },
    data: { name: name.trim(), birthDate: new Date(Date.UTC(birthYear, 0, 1)) },
  });

  return NextResponse.json({
    ok: true,
    name: patient.name,
    birthYear: patient.birthDate!.getUTCFullYear(),
    inviteCode: patient.inviteCode,
    doctorConnected: Boolean(patient.doctorId),
  });
}
