import { getCurrentPatient } from "@/lib/patientSession";

// Placeholder home for the patient web portal. The real menu (check-in,
// questionnaires, "Моя динамика", etc.) is wired up in a later slice; for now
// this just confirms the authed shell works end to end.
export default async function PortalHome() {
  const patient = await getCurrentPatient();

  return (
    <div className="page">
      <h2>Здравствуйте, {patient?.name}!</h2>
      <p className="hint">Личный кабинет пациента. Разделы появятся здесь в ближайших обновлениях.</p>
    </div>
  );
}
