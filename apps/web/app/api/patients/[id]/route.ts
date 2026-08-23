import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@mindsteady/db";
import { getCurrentDoctor } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, doctorId: doctor.id },
  });
  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  const { anamnesis, birthDate } = await req.json();

  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      anamnesis: typeof anamnesis === "string" ? anamnesis.trim() || null : undefined,
      birthDate: birthDate ? new Date(birthDate) : birthDate === "" ? null : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
