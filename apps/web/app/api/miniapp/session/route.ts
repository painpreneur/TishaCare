import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@mindsteady/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: auth.patientId } });
  return NextResponse.json({
    patientName: auth.patientName,
    needsOnboarding: !patient?.birthDate,
  });
}
