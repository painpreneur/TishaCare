import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDoctor } from "@/lib/session";
import { clinicLicenseInactive, LICENSE_INACTIVE_MESSAGE } from "@/lib/license";
import { isClinicAdmin } from "@/lib/doctorRole";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");

  const licenseInactive = clinicLicenseInactive(doctor);
  const clinicAdmin = isClinicAdmin(doctor);

  return (
    <div>
      <div className="topbar">
        <Link href="/dashboard" className="topbar-brand-link">
          <div className="brand">TishaCare</div>
          <div className="clinic">{doctor.clinic?.name ?? "Частная практика"}</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#465063" }}>{doctor.name}</span>
          {clinicAdmin && (
            <Link href="/dashboard/clinic" className="logout-btn" style={{ textDecoration: "none" }}>
              Клиника
            </Link>
          )}
          <Link href="/dashboard/settings" className="logout-btn" style={{ textDecoration: "none" }}>
            Настройки
          </Link>
          <LogoutButton />
        </div>
      </div>
      {licenseInactive && <div className="license-banner">{LICENSE_INACTIVE_MESSAGE}</div>}
      {children}
    </div>
  );
}
