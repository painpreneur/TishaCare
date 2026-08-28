import PatientHome from "@/components/patient/PatientHome";
import type { PatientFeature } from "@/components/patient/patientFeature";

// The daily pair, shown large at the top.
const PRIMARY: PatientFeature[] = [
  { href: "/checkin", emoji: "📝", title: "Чек-ин", desc: "Отметить состояние" },
  { href: "/progress", emoji: "📈", title: "Моя динамика", desc: "График по вашим отметкам" },
];

// Everything else.
const FEATURES: PatientFeature[] = [
  { href: "/tests", emoji: "📋", title: "Опросники и тесты", desc: "Скрининги и самонаблюдение" },
  { href: "/thoughts", emoji: "📓", title: "Дневник мыслей", desc: "Записать, что беспокоит" },
  { href: "/medications", emoji: "💊", title: "Медикаменты", desc: "Список и приём" },
  { href: "/care", emoji: "🩺", title: "Мои врачи", desc: "Подключение и управление доступом" },
];

export default function MiniAppHome() {
  return <PatientHome primary={PRIMARY} features={FEATURES} />;
}
