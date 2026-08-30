import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDoctor } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) redirect("/login");

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="brand">TishaCare</div>
          <div className="clinic">{doctor.clinic?.name ?? "Частная практика"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#465063" }}>{doctor.name}</span>
          <Link href="/dashboard/settings" className="logout-btn" style={{ textDecoration: "none" }}>
            Настройки
          </Link>
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
