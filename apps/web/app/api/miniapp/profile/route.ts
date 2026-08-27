import { NextRequest, NextResponse } from "next/server";
import { prisma, Patient } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

const MIN_BIRTH_DATE = "1920-01-01";

// Serialises a patient to the shape the profile screen expects. `birthDate` is
// a plain `YYYY-MM-DD` string (or null) so the client can bind it straight to
// <input type="date">.
function profileDto(patient: Patient) {
  return {
    name: patient.name,
    birthDate: patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : null,
    inviteCode: patient.inviteCode,
    doctorConnected: Boolean(patient.doctorId),
  };
}

/** Parses a `YYYY-MM-DD` string to a UTC-midnight Date, or null if invalid. */
function parseBirthDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Round-trip guards against impossible dates (Date rolls 2021-02-31 over).
  if (date.toISOString().slice(0, 10) !== value) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (value < MIN_BIRTH_DATE || value > today) return null;
  return date;
}

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: auth.patientId } });
  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  return NextResponse.json(profileDto(patient));
}

export async function PATCH(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { name, birthDate } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Введите имя" }, { status: 400 });
  }
  const parsedBirthDate = parseBirthDate(birthDate);
  if (!parsedBirthDate) {
    return NextResponse.json(
      { error: "Укажите корректную дату рождения (не раньше 1920 года и не в будущем)" },
      { status: 400 }
    );
  }

  const patient = await prisma.patient.update({
    where: { id: auth.patientId },
    data: { name: name.trim(), birthDate: parsedBirthDate },
  });

  return NextResponse.json({ ok: true, ...profileDto(patient) });
}
