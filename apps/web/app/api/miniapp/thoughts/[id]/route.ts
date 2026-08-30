import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveConsentedPatient } from "@/lib/telegramAuth";
import { readThoughtFields } from "@/lib/thoughts";

// Edit / delete a single diary entry. Both scoped to the entry's owner so one
// patient can never touch another's — `updateMany` / `deleteMany` with the
// patientId in the filter means a mismatched id simply affects 0 rows.

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fields = readThoughtFields(body);
  if (!fields.content) {
    return NextResponse.json({ error: "Введите текст" }, { status: 400 });
  }

  const { count } = await prisma.thought.updateMany({
    where: { id: params.id, patientId: auth.patientId },
    data: fields,
  });
  if (count === 0) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveConsentedPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const { count } = await prisma.thought.deleteMany({
    where: { id: params.id, patientId: auth.patientId },
  });
  if (count === 0) return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
