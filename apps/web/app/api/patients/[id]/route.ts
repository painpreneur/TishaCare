import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id: params.id,
      careLinks: { some: { doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } } },
    },
  });
  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  const { anamnesis, birthDate } = await req.json();
  const anamnesisChanged =
    typeof anamnesis === "string" && (anamnesis.trim() || null) !== patient.anamnesis;

  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      anamnesis: typeof anamnesis === "string" ? anamnesis.trim() || null : undefined,
      anamnesisUpdatedAt: anamnesisChanged ? new Date() : undefined,
      anamnesisUpdatedById: anamnesisChanged ? doctor.id : undefined,
      birthDate: birthDate ? new Date(birthDate) : birthDate === "" ? null : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
