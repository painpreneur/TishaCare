import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@mindsteady/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { MINIAPP_TESTS } from "@/lib/miniappTests";

export async function POST(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { testCode, results } = await req.json();
  const def = MINIAPP_TESTS[testCode];
  if (!def) {
    return NextResponse.json({ error: "Неизвестный тест" }, { status: 400 });
  }

  const { score, interpretation } = def.interpret(results);

  const questionnaire = await prisma.questionnaire.upsert({
    where: { code: def.code },
    update: {},
    create: { code: def.code, title: def.title },
  });

  await prisma.questionnaireResponse.create({
    data: {
      patientId: auth.patientId,
      questionnaireId: questionnaire.id,
      score,
      answers: JSON.stringify({ submission: results, interpretation }),
    },
  });

  return NextResponse.json({ ok: true, interpretation });
}
