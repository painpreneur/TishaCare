import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { canDoctorAccessPatient } from "@/lib/patientAccess";
import { licenseGate } from "@/lib/license";

// A planned appointment can be marked done (PATCH) or cancelled (DELETE).
// Done encounters are the append-only record and neither route touches them.

type DoctorLike = { id: string; clinicId: string | null; role: string };

async function loadPlanned(doctor: DoctorLike, patientId: string, encId: string) {
  if (!(await canDoctorAccessPatient(doctor, patientId))) {
    return { error: NextResponse.json({ error: "Пациент не найден" }, { status: 404 }) };
  }
  const enc = await prisma.encounter.findFirst({ where: { id: encId, patientId } });
  if (!enc) return { error: NextResponse.json({ error: "Запись не найдена" }, { status: 404 }) };
  if (enc.status !== "planned") {
    return { error: NextResponse.json({ error: "Это уже не запланированный приём" }, { status: 409 }) };
  }
  return { enc };
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string; encId: string } },
) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  const gate = licenseGate(doctor);
  if (gate) return gate;

  const { enc, error } = await loadPlanned(doctor, params.id, params.encId);
  if (error) return error;

  await prisma.encounter.update({ where: { id: enc.id }, data: { status: "done" } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; encId: string } },
) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  const gate = licenseGate(doctor);
  if (gate) return gate;

  const { enc, error } = await loadPlanned(doctor, params.id, params.encId);
  if (error) return error;

  await prisma.encounter.delete({ where: { id: enc.id } });
  return NextResponse.json({ ok: true });
}
