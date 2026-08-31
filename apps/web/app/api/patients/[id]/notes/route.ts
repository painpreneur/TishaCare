import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { licenseGate } from "@/lib/license";
import { canDoctorMessagePatient, DOCTOR_NOTE_MAX } from "@/lib/doctorNote";
import { notifyPatientTelegram } from "@/lib/patientNotify";

// Doctor sends a short one-way message to a patient.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  const gate = licenseGate(doctor);
  if (gate) return gate;

  if (!(await canDoctorMessagePatient(doctor, params.id))) {
    return NextResponse.json(
      { error: "Пациенту сейчас нельзя написать: связь неактивна или приостановлена" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  if (text.length > DOCTOR_NOTE_MAX) {
    return NextResponse.json(
      { error: `Не длиннее ${DOCTOR_NOTE_MAX} символов` },
      { status: 400 },
    );
  }

  const note = await prisma.doctorNote.create({
    data: { patientId: params.id, doctorId: doctor.id, body: text },
  });

  await notifyPatientTelegram(
    params.id,
    `Сообщение от врача (${doctor.name}):\n\n${text}\n\nОткройте приложение, чтобы отметить прочитанным.`,
  );

  return NextResponse.json({ ok: true, id: note.id });
}
