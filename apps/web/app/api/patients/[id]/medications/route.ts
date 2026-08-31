import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { licenseGate } from "@/lib/license";
import { notifyPatientTelegram } from "@/lib/patientNotify";

// Doctor prescribes a medication for a patient they currently follow.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  const gate = licenseGate(doctor);
  if (gate) return gate;

  const link = await prisma.careLink.findFirst({
    where: { patientId: params.id, doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } },
  });
  if (!link) return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });

  const { name, dosage, frequency, reason } = await req.json();
  if (!name?.trim() || !dosage?.trim() || !Number.isInteger(frequency) || frequency <= 0) {
    return NextResponse.json({ error: "Заполните название, дозировку и частоту" }, { status: 400 });
  }

  const medication = await prisma.medication.create({
    data: {
      patientId: params.id,
      name: String(name).trim(),
      dosage: String(dosage).trim(),
      frequency,
      reason: typeof reason === "string" ? reason.trim() || null : null,
      status: "active",
      prescriberType: "doctor",
      prescriberDoctorId: doctor.id,
    },
  });

  await notifyPatientTelegram(
    params.id,
    `${doctor.name} назначил(а) препарат: ${medication.name}, ${medication.dosage}, ${medication.frequency} раз/день.` +
      (medication.reason ? `\nПоказание: ${medication.reason}.` : "") +
      "\nПодробности — в приложении, раздел «Медикаменты».",
  );

  return NextResponse.json({ ok: true, id: medication.id });
}
