import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { isClinicAdmin } from "@/lib/doctorRole";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { clinicLicenseInactive } from "@/lib/license";
import { listClinicInvites } from "@/lib/clinicInvite";
import ClinicInvitePanel from "@/components/ClinicInvitePanel";
import DoctorRoleControls from "@/components/DoctorRoleControls";
import DoctorActivationControl from "@/components/DoctorActivationControl";

export default async function ClinicPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;
  if (!isClinicAdmin(doctor)) redirect("/dashboard");

  const clinicId = doctor.clinicId as string;
  const licenseInactive = clinicLicenseInactive(doctor);

  const [doctors, invites] = await Promise.all([
    prisma.doctor.findMany({
      where: { clinicId },
      // active (deactivatedAt IS NULL) first — Postgres sorts NULLs first on DESC
      orderBy: [{ deactivatedAt: "desc" }, { role: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, email: true, role: true, deactivatedAt: true },
    }),
    listClinicInvites(clinicId),
  ]);

  const [patientCounts, deactivatedLinks] = await Promise.all([
    prisma.careLink.groupBy({
      by: ["doctorId"],
      where: {
        doctorId: { in: doctors.map((d) => d.id) },
        status: { in: [...DOCTOR_VISIBLE_STATUSES] },
      },
      _count: { _all: true },
    }),
    prisma.careLink.findMany({
      where: {
        status: { in: [...DOCTOR_VISIBLE_STATUSES] },
        doctor: { clinicId, deactivatedAt: { not: null } },
      },
      select: { doctorId: true, patient: { select: { id: true, name: true } } },
      orderBy: { patient: { name: "asc" } },
    }),
  ]);

  const countByDoctor = new Map(patientCounts.map((c) => [c.doctorId, c._count._all]));
  const patientsByDeactivated = new Map<string, { id: string; name: string }[]>();
  for (const l of deactivatedLinks) {
    const arr = patientsByDeactivated.get(l.doctorId) ?? [];
    arr.push(l.patient);
    patientsByDeactivated.set(l.doctorId, arr);
  }

  const activeAdminCount = doctors.filter((d) => d.role === "admin" && !d.deactivatedAt).length;
  const pending = invites.filter((i) => !i.usedAt);
  const used = invites.filter((i) => i.usedAt);

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">
        ← На дашборд
      </Link>
      <h2>{doctor.clinic?.name ?? "Клиника"}</h2>

      <div className="panel">
        <h3>Врачи клиники ({doctors.length})</h3>
        <ul className="encounter-list">
          {doctors.map((d) => {
            const off = !!d.deactivatedAt;
            const covered = patientsByDeactivated.get(d.id) ?? [];
            return (
              <li key={d.id} style={off ? { opacity: 0.75 } : undefined}>
                <div className="encounter-head">
                  <strong>{d.name}</strong>
                  <span
                    className={`badge ${off ? "warn" : d.role === "admin" ? "ok" : "warn"}`}
                  >
                    {off ? "Отключён" : d.role === "admin" ? "Администратор" : "Врач"}
                  </span>
                </div>
                <p className="encounter-field">
                  <span className="encounter-field-label">{d.email}</span>
                  {" · "}
                  пациентов: {countByDoctor.get(d.id) ?? 0}
                </p>

                {!off && (
                  <DoctorRoleControls
                    doctorId={d.id}
                    role={d.role}
                    isSelf={d.id === doctor.id}
                    lastAdmin={d.role === "admin" && activeAdminCount <= 1}
                  />
                )}
                {d.id !== doctor.id && (
                  <DoctorActivationControl
                    doctorId={d.id}
                    doctorName={d.name}
                    deactivated={off}
                    lastActiveAdmin={d.role === "admin" && !off && activeAdminCount <= 1}
                  />
                )}

                {off && covered.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <p className="encounter-field-label">Пациенты этого врача (доступны вам):</p>
                    <ul className="clinic-covered-patients">
                      {covered.map((p) => (
                        <li key={p.id}>
                          <Link href={`/dashboard/patients/${p.id}`}>{p.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="panel">
        <h3>Приглашения</h3>
        {licenseInactive ? (
          <p className="hint">Лицензия клиники неактивна — новые приглашения недоступны.</p>
        ) : (
          <ClinicInvitePanel
            pending={pending.map((i) => ({
              id: i.id,
              email: i.email,
              token: i.token,
              expiresAt: i.expiresAt.toISOString(),
            }))}
          />
        )}
        {used.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 className="chart-subtitle">Использованные</h4>
            <ul className="encounter-list">
              {used.map((i) => (
                <li key={i.id}>
                  <p className="encounter-field">
                    {i.email ?? "без email"} ·{" "}
                    {i.usedAt && new Date(i.usedAt).toLocaleDateString("ru-RU")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
