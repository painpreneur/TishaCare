import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { canDoctorAccessPatient } from "@/lib/patientAccess";
import { licenseGate } from "@/lib/license";
import { ENCOUNTER_FIELDS, isEncounterType, isEncounterStatus } from "@/lib/encounter";
import { recordPatientProgress } from "@/lib/patientProgress";

// Doctor logs a past contact ("done") or schedules a future appointment
// ("planned"). Done encounters are append-only (no edit/delete); a planned one
// can be completed or cancelled via the [encId] route.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  const gate = licenseGate(doctor);
  if (gate) return gate;

  if (!(await canDoctorAccessPatient(doctor, params.id))) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type;
  if (!isEncounterType(type)) {
    return NextResponse.json({ error: "Выберите тип записи" }, { status: 400 });
  }

  const status = body.status ?? "done";
  if (!isEncounterStatus(status)) {
    return NextResponse.json({ error: "Неизвестный статус записи" }, { status: 400 });
  }

  const date = body.date ? new Date(body.date) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Укажите дату" }, { status: 400 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const fields: Record<string, string | null> = {};
  for (const f of ENCOUNTER_FIELDS) {
    const v = typeof body[f] === "string" ? body[f].trim() : "";
    fields[f] = v || null;
  }

  if (status === "planned") {
    if (date < startOfToday) {
      return NextResponse.json({ error: "Дата приёма должна быть сегодня или позже" }, { status: 400 });
    }
  } else {
    if (date.getTime() >= startOfToday.getTime() + 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Для состоявшейся записи дата не может быть в будущем" }, { status: 400 });
    }
    if (ENCOUNTER_FIELDS.every((f) => !fields[f])) {
      return NextResponse.json({ error: "Заполните хотя бы одно поле" }, { status: 400 });
    }
  }

  const encounter = await prisma.encounter.create({
    data: { patientId: params.id, doctorId: doctor.id, date, type, status, ...fields },
  });

  // A logged past appointment can earn the patient the "first-visit" unlock.
  if (status === "done") await recordPatientProgress(params.id);

  return NextResponse.json({ ok: true, id: encounter.id });
}
