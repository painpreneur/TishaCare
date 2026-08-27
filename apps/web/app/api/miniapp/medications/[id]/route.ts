import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveConsentedPatient } from "@/lib/telegramAuth";

async function assertOwnership(patientId: string, medicationId: string) {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } });
  return medication && medication.patientId === patientId ? medication : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const owned = await assertOwnership(auth.patientId, params.id);
  if (!owned) {
    return NextResponse.json({ error: "Медикамент не найден" }, { status: 404 });
  }

  const { name, dosage, frequency } = await req.json();
  if (frequency != null && (!Number.isInteger(frequency) || frequency <= 0)) {
    return NextResponse.json({ error: "Частота должна быть целым положительным числом" }, { status: 400 });
  }

  const medication = await prisma.medication.update({
    where: { id: params.id },
    data: {
      ...(name != null ? { name: String(name).trim() } : {}),
      ...(dosage != null ? { dosage: String(dosage).trim() } : {}),
      ...(frequency != null ? { frequency } : {}),
    },
  });

  return NextResponse.json({ ok: true, medication });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const owned = await assertOwnership(auth.patientId, params.id);
  if (!owned) {
    return NextResponse.json({ error: "Медикамент не найден" }, { status: 404 });
  }

  await prisma.medication.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
