import Link from "next/link";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import CareRequests from "@/components/CareRequests";

const MOOD_LABEL: Record<number, string> = {
  [-2]: "Очень плохо",
  [-1]: "Плохо",
  [0]: "Нормально",
  [1]: "Хорошо",
  [2]: "Отлично",
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default async function DashboardPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const [links, pending] = await Promise.all([
    prisma.careLink.findMany({
      where: { doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } },
      include: {
        patient: { include: { checkIns: { orderBy: { date: "desc" }, take: 1 } } },
      },
      orderBy: { patient: { name: "asc" } },
    }),
    prisma.careLink.findMany({
      where: { doctorId: doctor.id, status: "pending", requestedBy: "patient" },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="page">
      {pending.length > 0 && (
        <CareRequests
          requests={pending.map((p) => ({ id: p.id, patientName: p.patient.name }))}
        />
      )}

      <div className="page-header">
        <h2>Пациенты ({links.length})</h2>
        <Link href="/dashboard/patients/connect" className="btn-primary btn-inline">
          + Подключить пациента
        </Link>
      </div>
      <div className="patient-grid">
        {links.map((link) => {
          const patient = link.patient;
          const lastCheckIn = patient.checkIns[0];
          return (
            <Link key={link.id} href={`/dashboard/patients/${patient.id}`} className="patient-card">
              <div className="name">{patient.name}</div>
              {link.status === "paused" && (
                <span className="badge warn">Пациент приостановил передачу данных</span>
              )}
              {link.status === "ending" && link.endsAt && (
                <span className="badge warn">Связь завершается {formatDate(link.endsAt)}</span>
              )}
              {lastCheckIn ? (
                <span className={`badge ${lastCheckIn.mood >= 0 ? "ok" : "warn"}`}>
                  Последний чек-ин: {MOOD_LABEL[lastCheckIn.mood]}
                </span>
              ) : (
                <span className="badge warn">Нет чек-инов</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
