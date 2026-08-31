import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const { count } = await prisma.doctorNote.updateMany({
    where: { id: params.id, patientId: auth.patientId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    // already read, or not this patient's note — treat as done either way
    const exists = await prisma.doctorNote.count({
      where: { id: params.id, patientId: auth.patientId },
    });
    if (!exists) return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
