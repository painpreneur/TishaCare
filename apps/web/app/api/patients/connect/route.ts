import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";

export async function POST(req: NextRequest) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { code } = await req.json();
  const inviteCode = String(code || "").trim().toUpperCase();
  if (!inviteCode) {
    return NextResponse.json({ error: "Введите код" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({ where: { inviteCode } });
  if (!patient) {
    return NextResponse.json({ error: "Пациент с таким кодом не найден" }, { status: 404 });
  }
  if (patient.doctorId) {
    return NextResponse.json({ error: "Этот пациент уже подключён к врачу" }, { status: 409 });
  }

  await prisma.patient.update({
    where: { id: patient.id },
    data: { clinicId: doctor.clinicId, doctorId: doctor.id },
  });

  return NextResponse.json({ ok: true, patientId: patient.id });
}
