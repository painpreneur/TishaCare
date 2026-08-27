import PatientHome, { PatientFeature } from "@/components/patient/PatientHome";

const FEATURES: PatientFeature[] = [
  { href: "/checkin", emoji: "📝", title: "Чек-ин", desc: "Настроение, сон, энергия, лекарства" },
  { href: "/medications", emoji: "💊", title: "Медикаменты", desc: "Список и приём" },
  { href: "/thoughts", emoji: "📓", title: "Дневник мыслей", desc: "Записать, что беспокоит" },
  { href: "/support", emoji: "🧠", title: "Поддержка", desc: "Чат с GPT-ассистентом" },
  { href: "/beck", emoji: "📋", title: "Депрессия (Бек)", desc: "Опросник, 21 вопрос" },
  { href: "/mdq", emoji: "📋", title: "Мания (MDQ)", desc: "Скрининг биполярного спектра" },
  { href: "/cognitive-test", emoji: "🧩", title: "Когнитивный тест", desc: "~10 минут, память и внимание" },
  { href: "/profile", emoji: "👤", title: "Профиль", desc: "Данные и код подключения к врачу" },
];

export default function MiniAppHome() {
  return <PatientHome features={FEATURES} />;
}
