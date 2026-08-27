import { NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";

// This doctor's care links: pending requests from patients first, then the
// links they currently see data through.
export async function GET() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const links = await prisma.careLink.findMany({
    where: { doctorId: doctor.id, status: { in: ["pending", "active", "paused", "ending"] } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { patient: { select: { name: true } } },
  });

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      status: l.status,
      requestedBy: l.requestedBy,
      managedByClinic: l.managedByClinic,
      endsAt: l.endsAt,
      patientId: l.patientId,
      patientName: l.patient.name,
    })),
  });
}
