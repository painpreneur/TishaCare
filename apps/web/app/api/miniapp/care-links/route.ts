import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { CareLinkError, requestLink } from "@/lib/careLink";

// The patient's connections, newest first, with the doctor's name.
export async function GET(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const links = await prisma.careLink.findMany({
    where: { patientId: auth.patientId },
    orderBy: { updatedAt: "desc" },
    include: { doctor: { select: { name: true, clinic: { select: { name: true } } } } },
  });

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      status: l.status,
      requestedBy: l.requestedBy,
      managedByClinic: l.managedByClinic,
      endsAt: l.endsAt,
      doctorName: l.doctor.name,
      clinicName: l.doctor.clinic?.name ?? null,
    })),
  });
}

// Patient requests a connection to a doctor by the doctor's connect code.
export async function POST(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const connectCode = String(body.connectCode ?? "");

  try {
    const link = await requestLink(auth.patientId, connectCode);
    return NextResponse.json({ ok: true, id: link.id, status: link.status });
  } catch (e) {
    if (e instanceof CareLinkError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
