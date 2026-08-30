import Link from "next/link";
import { getCurrentDoctor } from "@/lib/session";
import DoctorProfileForm from "@/components/DoctorProfileForm";
import DoctorConnectCode from "@/components/DoctorConnectCode";
import DoctorSignOutAll from "@/components/DoctorSignOutAll";

export default async function DoctorSettingsPage() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return null;

  return (
    <div className="page">
      <Link href="/dashboard" className="back-link">
        ← На дашборд
      </Link>
      <h2>Настройки</h2>

      <div className="panel">
        <h3>Профиль</h3>
        <DoctorProfileForm initialName={doctor.name} initialEmail={doctor.email} />
      </div>

      <div className="panel">
        <h3>Код для пациентов</h3>
        <DoctorConnectCode code={doctor.connectCode} variant="full" />
      </div>

      <div className="panel">
        <h3>Безопасность</h3>
        <DoctorSignOutAll />
      </div>
    </div>
  );
}
