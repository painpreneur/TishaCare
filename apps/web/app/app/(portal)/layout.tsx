import { redirect } from "next/navigation";
import { getCurrentPatient } from "@/lib/patientSession";
import PatientLogoutButton from "@/components/PatientLogoutButton";

// Authed shell for the patient web portal. /app/login and /app/register live
// outside this route group, so they don't hit this redirect.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const patient = await getCurrentPatient();
  if (!patient) redirect("/app/login");

  return (
    <div>
      <div className="topbar">
        <div className="brand">TishaCare</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#465063" }}>{patient.name}</span>
          <PatientLogoutButton />
        </div>
      </div>
      <div className="miniapp-page">{children}</div>
    </div>
  );
}
