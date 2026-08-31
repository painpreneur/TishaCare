import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDoctor } from "@/lib/session";
import { clinicLicenseInactive, LICENSE_INACTIVE_MESSAGE } from "@/lib/license";
import { isClinicAdmin } from "@/lib/doctorRole";
import LogoutButton from "@/components/LogoutButton";
import DashboardScaleControl from "@/components/DashboardScaleControl";

// Applies the saved text-size choice before first paint so the panel does not
// visibly jump on load. Runs on `.doc-panel` (its parent), which carries
// suppressHydrationWarning; DashboardScaleControl keeps it in sync afterwards.
const SCALE_BOOT = `try{var s=localStorage.getItem('tc_doc_scale');if(s==='m'||s==='l')document.currentScript.parentElement.setAttribute('data-doc-scale',s)}catch(e){}`;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");

  const licenseInactive = clinicLicenseInactive(doctor);
  const clinicAdmin = isClinicAdmin(doctor);

  return (
    <div className="doc-panel" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: SCALE_BOOT }} />
      <div className="topbar">
        <Link href="/dashboard" className="topbar-brand-link">
          <div className="brand">TishaCare</div>
          <div className="clinic">{doctor.clinic?.name ?? "Частная практика"}</div>
        </Link>
        <div className="topbar-actions">
          <DashboardScaleControl />
          <span className="topbar-doctor">{doctor.name}</span>
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
