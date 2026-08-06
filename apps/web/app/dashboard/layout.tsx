import { getCurrentDoctor } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const doctor = await getCurrentDoctor();

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="brand">MindSteady</div>
          <div className="clinic">{doctor?.clinic.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#465063" }}>{doctor?.name}</span>
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
