import PatientHome, { PatientFeature } from "@/components/patient/PatientHome";

const FEATURES: PatientFeature[] = [
  { href: "/checkin", emoji: "📝", title: "Чек-ин", desc: "Настроение, сон, энергия, лекарства" },
  { href: "/progress", emoji: "📈", title: "Моя динамика", desc: "График настроения, сна и энергии" },
  { href: "/care", emoji: "🩺", title: "Мои врачи", desc: "Подключение и управление доступом" },
  { href: "/medications", emoji: "💊", title: "Медикаменты", desc: "Список и приём" },
  { href: "/thoughts", emoji: "📓", title: "Дневник мыслей", desc: "Записать, что беспокоит" },
  { href: "/support", emoji: "🧠", title: "Поддержка", desc: "Чат с GPT-ассистентом" },
  { href: "/beck", emoji: "📋", title: "Депрессия (Бек)", desc: "Опросник, 21 вопрос" },
  { href: "/mdq", emoji: "📋", title: "Мания (MDQ)", desc: "Скрининг биполярного спектра" },
  { href: "/gad7", emoji: "📋", title: "Тревога (GAD-7)", desc: "Скрининг тревоги, 7 вопросов" },
  { href: "/asrs", emoji: "📋", title: "Внимание (ASRS)", desc: "Скрининг СДВГ, 6 вопросов" },
  { href: "/aq10", emoji: "📋", title: "Черты спектра (AQ-10)", desc: "Скрининг РАС, 10 утверждений" },
  { href: "/msi-bpd", emoji: "📋", title: "Границы (MSI-BPD)", desc: "Скрининг ПРЛ, 10 вопросов" },
  { href: "/cognitive-test", emoji: "🧩", title: "Когнитивный тест", desc: "~10 минут, память и внимание" },
  { href: "/profile", emoji: "👤", title: "Профиль", desc: "Данные и код подключения к врачу" },
];

export default function MiniAppHome() {
  return <PatientHome features={FEATURES} />;
}
