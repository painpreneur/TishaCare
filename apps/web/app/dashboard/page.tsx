import Link from "next/link";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { clinicLicenseInactive } from "@/lib/license";
import { assessPatient, type TriageFlag } from "@/lib/triage";
import { ENCOUNTER_TYPE_LABEL, type EncounterType } from "@/lib/encounter";
import CareRequests from "@/components/CareRequests";
import DoctorConnectCode from "@/components/DoctorConnectCode";

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

// Which record panel an attention card should open. Flags about silence or a
// mood trend have no single panel (the chart is always visible up top), so they
// just open the record normally.
const FOCUS_BY_FLAG: Record<TriageFlag["kind"], string | null> = {
  silent: null,
  mood_drop: null,
  meds_missed: "medications",
  poor_tolerability: "medications",
  mdq_positive: "responses",
  phq9_self_harm: "responses",
};

function focusFor(flags: TriageFlag[]): string | null {
  for (const f of flags) {
    const panel = FOCUS_BY_FLAG[f.kind];
    if (panel) return panel;
  }
  return null;
}

export default async function DashboardPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  const licenseInactive = clinicLicenseInactive(doctor);

  const [links, pending, planned] = await Promise.all([
    prisma.careLink.findMany({
      where: { doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } },
      include: {
        patient: {
          include: {
            checkIns: { orderBy: { date: "desc" }, take: 60 },
            responses: {
              include: { questionnaire: { select: { code: true } } },
              orderBy: { completedAt: "desc" },
              take: 20,
            },
            medications: {
              where: { status: "active" },
              include: { reports: { orderBy: { date: "desc" }, take: 5 } },
            },
          },
        },
      },
    }),
    prisma.careLink.findMany({
      where: { doctorId: doctor.id, status: "pending", requestedBy: "patient" },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.encounter.findMany({
      where: { doctorId: doctor.id, status: "planned" },
      orderBy: { date: "asc" },
      include: { patient: { select: { id: true, name: true } } },
    }),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const linkedPatientIds = new Set(links.map((l) => l.patientId));
  const upcoming = planned.filter((e) => linkedPatientIds.has(e.patientId)).slice(0, 12);

  const assessed = links.map((link) => ({
    link,
    patient: link.patient,
    ...assessPatient({
      checkIns: link.patient.checkIns,
      responses: link.patient.responses,
      medications: link.patient.medications,
    }),
  }));

  const attention = assessed
    .filter((a) => a.flags.length > 0)
    .sort((a, b) => (a.lastSignalAt ?? 0) - (b.lastSignalAt ?? 0));
  const rest = assessed
    .filter((a) => a.flags.length === 0)
    .sort((a, b) => (b.lastSignalAt ?? 0) - (a.lastSignalAt ?? 0));

  function statusBadge(link: (typeof links)[number]) {
    if (link.status === "paused") {
      return <span className="badge warn">Пациент приостановил передачу данных</span>;
    }
    if (link.status === "ending" && link.endsAt) {
      return <span className="badge warn">Связь завершается {formatDate(link.endsAt)}</span>;
    }
    const last = link.patient.checkIns[0];
    return last ? (
      <span className={`badge ${last.mood >= 0 ? "ok" : "warn"}`}>
        Последний чек-ин: {MOOD_LABEL[last.mood]}
      </span>
    ) : (
      <span className="badge warn">Нет чек-инов</span>
    );
  }

  return (
    <div className="page">
      {!licenseInactive && pending.length > 0 && (
        <CareRequests
          requests={pending.map((p) => ({ id: p.id, patientName: p.patient.name }))}
        />
      )}

      <DoctorConnectCode code={doctor.connectCode} variant="inline" />

      {upcoming.length > 0 && (
        <div className="panel">
          <h3>Ближайшие приёмы</h3>
          <ul className="encounter-list">
            {upcoming.map((e) => {
              const overdue = e.date.getTime() < startOfToday.getTime();
              return (
                <li key={e.id}>
                  <div className="encounter-head">
                    <Link href={`/dashboard/patients/${e.patient.id}`}>
                      <strong>{e.patient.name}</strong>
                    </Link>
                    <span className={`badge ${overdue ? "warn" : "ok"}`}>
                      {overdue ? "Просрочен" : new Date(e.date).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="encounter-field">
                    {ENCOUNTER_TYPE_LABEL[e.type as EncounterType] ?? e.type}
                    {overdue && ` · был назначен на ${new Date(e.date).toLocaleDateString("ru-RU")}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="page-header">
        <h2>Пациенты ({links.length})</h2>
        {!licenseInactive && (
          <Link href="/dashboard/patients/connect" className="btn-primary btn-inline">
            + Подключить пациента
          </Link>
        )}
      </div>

      {attention.length > 0 && (
        <div className="panel">
          <h3>Требуют внимания ({attention.length})</h3>
          <div className="patient-grid">
            {attention.map(({ link, patient, flags }) => {
              const focus = focusFor(flags);
              return (
                <Link
                  key={link.id}
                  href={`/dashboard/patients/${patient.id}${focus ? `?focus=${focus}` : ""}`}
                  className="patient-card attention"
                >
                  <div className="name">{patient.name}</div>
                  <ul className="triage-flags">
                    {flags.map((f) => (
                      <li key={f.kind}>{f.label}</li>
                    ))}
                  </ul>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="patient-grid">
        {rest.map(({ link, patient }) => (
          <Link key={link.id} href={`/dashboard/patients/${patient.id}`} className="patient-card">
            <div className="name">{patient.name}</div>
            {statusBadge(link)}
          </Link>
        ))}
      </div>
    </div>
  );
}
