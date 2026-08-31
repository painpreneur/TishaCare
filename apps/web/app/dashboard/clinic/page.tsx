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

export default async function ClinicPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;
  if (!isClinicAdmin(doctor)) redirect("/dashboard");

  const clinicId = doctor.clinicId as string;
  const licenseInactive = clinicLicenseInactive(doctor);

  const [doctors, invites] = await Promise.all([
    prisma.doctor.findMany({
      where: { clinicId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, email: true, role: true },
    }),
    listClinicInvites(clinicId),
  ]);

  const patientCounts = await prisma.careLink.groupBy({
    by: ["doctorId"],
    where: { doctorId: { in: doctors.map((d) => d.id) }, status: { in: [...DOCTOR_VISIBLE_STATUSES] } },
    _count: { _all: true },
  });
  const countByDoctor = new Map(patientCounts.map((c) => [c.doctorId, c._count._all]));
  const adminCount = doctors.filter((d) => d.role === "admin").length;

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
          {doctors.map((d) => (
            <li key={d.id}>
              <div className="encounter-head">
                <strong>{d.name}</strong>
                <span className={`badge ${d.role === "admin" ? "ok" : "warn"}`}>
                  {d.role === "admin" ? "Администратор" : "Врач"}
                </span>
              </div>
              <p className="encounter-field">
                <span className="encounter-field-label">{d.email}</span>
                {" · "}
                пациентов: {countByDoctor.get(d.id) ?? 0}
              </p>
              <DoctorRoleControls
                doctorId={d.id}
                role={d.role}
                isSelf={d.id === doctor.id}
                lastAdmin={d.role === "admin" && adminCount <= 1}
              />
            </li>
          ))}
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
