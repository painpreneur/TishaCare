import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient, hasCurrentConsent } from "@/lib/telegramAuth";
import { CONSENT_VERSION } from "@/lib/consent";

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }
  return NextResponse.json({
    version: CONSENT_VERSION,
    consented: hasCurrentConsent(auth),
    consentAt: auth.consentAt,
  });
}

export async function POST(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  await prisma.patient.update({
    where: { id: auth.patientId },
    data: { consentAt: new Date(), consentVersion: CONSENT_VERSION },
  });

  return NextResponse.json({ ok: true });
}
