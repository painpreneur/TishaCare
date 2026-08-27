import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient, resolveConsentedPatient } from "@/lib/telegramAuth";

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const medications = await prisma.medication.findMany({
    where: { patientId: auth.patientId },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    include: { reports: { orderBy: { date: "desc" } } },
  });

  return NextResponse.json({ medications });
}

export async function POST(req: NextRequest) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { name, dosage, frequency } = await req.json();
  if (!name?.trim() || !dosage?.trim() || !Number.isInteger(frequency) || frequency <= 0) {
    return NextResponse.json({ error: "Заполните название, дозировку и частоту (целое число)" }, { status: 400 });
  }

  const medication = await prisma.medication.create({
    data: { patientId: auth.patientId, name: name.trim(), dosage: dosage.trim(), frequency },
  });

  return NextResponse.json({ ok: true, medication });
}
