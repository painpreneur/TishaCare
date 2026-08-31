import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

// Doctor messages the patient sees in the Mini App: all unread, plus a few of
// the most recent read ones for context.
export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const notes = await prisma.doctorNote.findMany({
    where: { patientId: auth.patientId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { doctor: { select: { name: true } } },
  });

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      doctorName: n.doctor.name,
      createdAt: n.createdAt.toISOString(),
      read: n.readAt != null,
    })),
  });
}
