import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { SAFETY_PLAN_FIELDS, SAFETY_FIELD_MAX } from "@/lib/safetyPlan";

function dto(plan: { warningSigns: string | null; copingSteps: string | null; contacts: string | null; updatedAt: Date } | null) {
  return {
    warningSigns: plan?.warningSigns ?? null,
    copingSteps: plan?.copingSteps ?? null,
    contacts: plan?.contacts ?? null,
    updatedAt: plan ? plan.updatedAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const plan = await prisma.safetyPlan.findUnique({ where: { patientId: auth.patientId } });
  return NextResponse.json(dto(plan));
}

export async function PUT(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  for (const f of SAFETY_PLAN_FIELDS) {
    const v = typeof body[f] === "string" ? body[f].trim().slice(0, SAFETY_FIELD_MAX) : "";
    data[f] = v || null;
  }

  const plan = await prisma.safetyPlan.upsert({
    where: { patientId: auth.patientId },
    create: { patientId: auth.patientId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, ...dto(plan) });
}
