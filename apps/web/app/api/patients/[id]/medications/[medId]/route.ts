import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { notifyPatientTelegram } from "@/lib/patientNotify";

// Doctor stops or reactivates a course. Stopping takes a free-text reason and
// keeps the row (it becomes the patient's history of stopped courses).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; medId: string } },
) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const link = await prisma.careLink.findFirst({
    where: { patientId: params.id, doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } },
  });
  if (!link) return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });

  const med = await prisma.medication.findFirst({
    where: { id: params.medId, patientId: params.id },
  });
  if (!med) return NextResponse.json({ error: "Препарат не найден" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (status !== "stopped" && status !== "active") {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  }

  if (status === "stopped") {
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
    await prisma.medication.update({
      where: { id: med.id },
      data: { status: "stopped", endedAt: new Date(), stopReason: reason || null },
    });
    await notifyPatientTelegram(
      params.id,
      `${doctor.name} отменил(а) приём: ${med.name}, ${med.dosage}.` +
        (reason ? `\nПричина: ${reason}.` : ""),
    );
    return NextResponse.json({ ok: true });
  }

  // reactivate — the previous stop reason no longer applies
  await prisma.medication.update({
    where: { id: med.id },
    data: { status: "active", endedAt: null, stopReason: null },
  });
  await notifyPatientTelegram(
    params.id,
    `${doctor.name} возобновил(а) приём: ${med.name}, ${med.dosage}.`,
  );
  return NextResponse.json({ ok: true });
}
