import PatientHome, { PatientFeature } from "@/components/patient/PatientHome";

// Web portal menu. A subset of the Mini App for now; the questionnaires and
// thoughts screens are ported in a later slice.
const FEATURES: PatientFeature[] = [
  { href: "/checkin", emoji: "📝", title: "Чек-ин", desc: "Настроение, сон, энергия, лекарства" },
  { href: "/progress", emoji: "📈", title: "Моя динамика", desc: "График настроения, сна и энергии" },
  { href: "/care", emoji: "🩺", title: "Мои врачи", desc: "Подключение и управление доступом" },
  { href: "/medications", emoji: "💊", title: "Медикаменты", desc: "Курсы приёма и переносимость" },
  { href: "/profile", emoji: "👤", title: "Профиль", desc: "Данные и код подключения к врачу" },
];

export default function PortalHome() {
  return <PatientHome features={FEATURES} />;
}
