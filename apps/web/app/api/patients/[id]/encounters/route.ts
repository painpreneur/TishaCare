import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { ENCOUNTER_FIELDS, isEncounterType } from "@/lib/encounter";

// Doctor adds a visit / contact note for a patient they currently follow.
// Append-only: there is no PATCH or DELETE here by design.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const link = await prisma.careLink.findFirst({
    where: {
      patientId: params.id,
      doctorId: doctor.id,
      status: { in: [...DOCTOR_VISIBLE_STATUSES] },
    },
  });
  if (!link) return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const type = body.type;
  if (!isEncounterType(type)) {
    return NextResponse.json({ error: "Выберите тип записи" }, { status: 400 });
  }

  const date = body.date ? new Date(body.date) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Укажите дату" }, { status: 400 });
  }

  const fields: Record<string, string | null> = {};
  for (const f of ENCOUNTER_FIELDS) {
    const v = typeof body[f] === "string" ? body[f].trim() : "";
    fields[f] = v || null;
  }
  if (ENCOUNTER_FIELDS.every((f) => !fields[f])) {
    return NextResponse.json({ error: "Заполните хотя бы одно поле" }, { status: 400 });
  }

  const encounter = await prisma.encounter.create({
    data: { patientId: params.id, doctorId: doctor.id, date, type, ...fields },
  });

  return NextResponse.json({ ok: true, id: encounter.id });
}
