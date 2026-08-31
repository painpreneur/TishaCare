import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { patientAccessWhere } from "@/lib/patientAccess";
import { buildPatientRecordCsv } from "@/lib/patientRecordCsv";

// Flat CSV of the patient record for import into a clinic EHR. Same access
// rules as the printable export page. Doctor notes are intentionally excluded.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return new NextResponse("Не авторизованы", { status: 401 });

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, ...patientAccessWhere(doctor) },
    include: {
      checkIns: { orderBy: { date: "asc" } },
      sleepEntries: { orderBy: { date: "asc" } },
      responses: { include: { questionnaire: true }, orderBy: { completedAt: "asc" } },
      medications: {
        orderBy: [{ status: "asc" }, { startedAt: "desc" }],
        include: {
          reports: { orderBy: { date: "asc" } },
          prescriberDoctor: { select: { name: true } },
        },
      },
      encounters: { include: { doctor: { select: { name: true } } }, orderBy: { date: "asc" } },
      thoughts: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!patient) return new NextResponse("Пациент не найден", { status: 404 });

  const csv = buildPatientRecordCsv({
    name: patient.name,
    birthDate: patient.birthDate,
    anamnesis: patient.anamnesis,
    checkIns: patient.checkIns,
    sleepEntries: patient.sleepEntries,
    responses: patient.responses,
    medications: patient.medications,
    encounters: patient.encounters,
    thoughts: patient.thoughts,
    doctor: { name: doctor.name, clinic: doctor.clinic ? { name: doctor.clinic.name } : null },
  });

  const slug =
    patient.name
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "patient";
  const filename = `karta-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  // BOM so Excel (RU locale) opens UTF-8 correctly.
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
