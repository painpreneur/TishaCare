import PatientHome from "@/components/patient/PatientHome";
import type { PatientFeature } from "@/components/patient/patientFeature";

// Same menu as the Mini App; the web portal is now at feature parity.
const PRIMARY: PatientFeature[] = [
  { href: "/checkin", emoji: "📝", title: "Чек-ин", desc: "Отметить состояние" },
  { href: "/progress", emoji: "📈", title: "Моя динамика", desc: "График по вашим отметкам" },
];

const FEATURES: PatientFeature[] = [
  { href: "/tests", emoji: "📋", title: "Опросники и тесты", desc: "Скрининги и самонаблюдение" },
  { href: "/thoughts", emoji: "📓", title: "Дневник мыслей", desc: "Записать, что беспокоит" },
  { href: "/medications", emoji: "💊", title: "Медикаменты", desc: "Курсы приёма и переносимость" },
  { href: "/discoveries", emoji: "🧭", title: "Открытия", desc: "Путь к первому приёму и дальше" },
  { href: "/care", emoji: "🩺", title: "Мои врачи", desc: "Подключение и управление доступом" },
];

export default function PortalHome() {
  return <PatientHome primary={PRIMARY} features={FEATURES} />;
}
