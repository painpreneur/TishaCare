import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@mindsteady/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const thoughts = await prisma.thought.findMany({
    where: { patientId: auth.patientId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ thoughts });
}

export async function POST(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Введите текст" }, { status: 400 });
  }

  const thought = await prisma.thought.create({
    data: { patientId: auth.patientId, content: content.trim() },
  });

  return NextResponse.json({ ok: true, thought });
}
