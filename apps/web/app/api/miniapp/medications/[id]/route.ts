import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveConsentedPatient } from "@/lib/telegramAuth";

async function ownedMedication(patientId: string, medicationId: string) {
  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
    include: { _count: { select: { reports: true } } },
  });
  return medication && medication.patientId === patientId ? medication : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const owned = await ownedMedication(auth.patientId, params.id);
  if (!owned) return NextResponse.json({ error: "Медикамент не найден" }, { status: 404 });

  const { name, dosage, frequency, status } = await req.json();
  if (frequency != null && (!Number.isInteger(frequency) || frequency <= 0)) {
    return NextResponse.json({ error: "Частота должна быть целым положительным числом" }, { status: 400 });
  }
  if (status != null && !["active", "stopped"].includes(status)) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  }

  const medication = await prisma.medication.update({
    where: { id: params.id },
    data: {
      ...(name != null ? { name: String(name).trim() } : {}),
      ...(dosage != null ? { dosage: String(dosage).trim() } : {}),
      ...(frequency != null ? { frequency } : {}),
      // "stopped" closes the course; "active" reopens it.
      ...(status === "stopped" ? { status: "stopped", endedAt: new Date() } : {}),
      ...(status === "active" ? { status: "active", endedAt: null } : {}),
    },
  });

  return NextResponse.json({ ok: true, medication });
}

// Only lets the patient delete a mistaken entry that has no reports on it;
// real courses are stopped, not deleted.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const owned = await ownedMedication(auth.patientId, params.id);
  if (!owned) return NextResponse.json({ error: "Медикамент не найден" }, { status: 404 });
  if (owned._count.reports > 0) {
    return NextResponse.json(
      { error: "У этого препарата есть отметки о переносимости, его можно только отменить" },
      { status: 409 }
    );
  }

  await prisma.medication.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
