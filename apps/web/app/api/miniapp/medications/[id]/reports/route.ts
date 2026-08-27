import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveConsentedPatient } from "@/lib/telegramAuth";
import { SIDE_EFFECT_TAG_LABEL } from "@/lib/medication";

function scale(v: unknown): number | null {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : null;
}

// Patient records how a medication is going for them.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const medication = await prisma.medication.findUnique({ where: { id: params.id } });
  if (!medication || medication.patientId !== auth.patientId) {
    return NextResponse.json({ error: "Медикамент не найден" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const tolerability = scale(body.tolerability);
  const perceivedBenefit = scale(body.perceivedBenefit);
  const sideEffects = typeof body.sideEffects === "string" ? body.sideEffects.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const sideEffectTags = Array.isArray(body.sideEffectTags)
    ? body.sideEffectTags.filter((t: unknown): t is string => typeof t === "string" && t in SIDE_EFFECT_TAG_LABEL)
    : [];

  if (tolerability == null && perceivedBenefit == null && !sideEffects && !note && sideEffectTags.length === 0) {
    return NextResponse.json({ error: "Заполните хотя бы одно поле" }, { status: 400 });
  }

  const report = await prisma.medicationReport.create({
    data: {
      medicationId: params.id,
      patientId: auth.patientId,
      tolerability,
      perceivedBenefit,
      sideEffects,
      note,
      sideEffectTags: sideEffectTags.length ? sideEffectTags.join(",") : null,
    },
  });

  return NextResponse.json({ ok: true, id: report.id });
}
