import Link from "next/link";
import { prisma } from "@mindsteady/db";
import { getCurrentDoctor } from "@/lib/session";

const MOOD_LABEL: Record<number, string> = {
  [-2]: "Очень плохо",
  [-1]: "Плохо",
  [0]: "Нормально",
  [1]: "Хорошо",
  [2]: "Отлично",
};

export default async function DashboardPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const patients = await prisma.patient.findMany({
    where: { doctorId: doctor.id },
    include: {
      checkIns: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="page">
      <div className="page-header">
        <h2>Пациенты ({patients.length})</h2>
        <Link href="/dashboard/patients/connect" className="btn-primary btn-inline">
          + Подключить пациента
        </Link>
      </div>
      <div className="patient-grid">
        {patients.map((patient) => {
          const lastCheckIn = patient.checkIns[0];
          return (
            <Link key={patient.id} href={`/dashboard/patients/${patient.id}`} className="patient-card">
              <div className="name">{patient.name}</div>
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
