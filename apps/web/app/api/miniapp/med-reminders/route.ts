import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient, resolveConsentedPatient } from "@/lib/telegramAuth";

// The patient's opt-in daily med-intake nudge (delivered with the evening
// reminder). See packages/bot-core/medReminders.ts.

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const patient = await prisma.patient.findUnique({
    where: { id: auth.patientId },
    select: { medReminderEnabled: true },
  });
  return NextResponse.json({ enabled: !!patient?.medReminderEnabled });
}

export async function PUT(req: NextRequest) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Ожидается enabled: boolean" }, { status: 400 });
  }

  await prisma.patient.update({
    where: { id: auth.patientId },
    data: { medReminderEnabled: body.enabled },
  });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
