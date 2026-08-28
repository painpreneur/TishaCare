import { NextRequest, NextResponse } from "next/server";
import { prisma, questionnaireDef } from "@tishacare/db";
import { resolveMiniAppPatient, resolveConsentedPatient } from "@/lib/telegramAuth";

// Autosaved progress for an in-flight questionnaire. GET restores it, PUT
// upserts on every answer, DELETE clears it on submit or discard.

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const draft = await prisma.questionnaireDraft.findUnique({
    where: { patientId_questionnaireCode: { patientId: auth.patientId, questionnaireCode: params.code } },
  });

  return NextResponse.json({
    draft: draft
      ? { answers: JSON.parse(draft.answers) as number[], lastIndex: draft.lastIndex }
      : null,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { code: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const def = questionnaireDef(params.code);
  if (!def) return NextResponse.json({ error: "Неизвестный опросник" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (
    answers.length > def.questions.length ||
    answers.some((v: unknown) => v != null && !Number.isInteger(v))
  ) {
    return NextResponse.json({ error: "Некорректные ответы" }, { status: 400 });
  }
  const lastIndex = Number.isInteger(body.lastIndex)
    ? Math.max(0, Math.min(body.lastIndex, def.questions.length - 1))
    : 0;

  const data = { answers: JSON.stringify(answers), lastIndex };
  await prisma.questionnaireDraft.upsert({
    where: { patientId_questionnaireCode: { patientId: auth.patientId, questionnaireCode: params.code } },
    create: { patientId: auth.patientId, questionnaireCode: params.code, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  await prisma.questionnaireDraft
    .delete({
      where: { patientId_questionnaireCode: { patientId: auth.patientId, questionnaireCode: params.code } },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
