"use client";

import BackLink from "@/components/miniapp/BackLink";
import FeatureGrid from "./FeatureGrid";
import type { PatientFeature } from "./patientFeature";

// The questionnaire library, one level down from the home menu. Two honest
// groups for the patient: screeners (discuss the result with a doctor) and
// self-observation. The clinical `phases` on each QuestionnaireDef drive the
// future "assigned by your doctor" section, not this list.
const SCREENERS: PatientFeature[] = [
  { href: "/beck", emoji: "📋", title: "Депрессия (Бек)", desc: "Опросник, 21 вопрос" },
  { href: "/phq9", emoji: "📋", title: "Депрессия (PHQ-9)", desc: "Короткий опросник, 9 вопросов" },
  { href: "/mdq", emoji: "📋", title: "Мания (MDQ)", desc: "Скрининг биполярного спектра" },
  { href: "/ymrs", emoji: "📋", title: "Мания (YMRS)", desc: "Выраженность подъёма, самооценка" },
  { href: "/gad7", emoji: "📋", title: "Тревога (GAD-7)", desc: "Скрининг тревоги, 7 вопросов" },
  { href: "/asrs", emoji: "📋", title: "Внимание (ASRS)", desc: "Скрининг СДВГ, 6 вопросов" },
  { href: "/aq10", emoji: "📋", title: "Черты спектра (AQ-10)", desc: "Скрининг РАС, 10 утверждений" },
  { href: "/msi-bpd", emoji: "📋", title: "Границы (MSI-BPD)", desc: "Скрининг ПРЛ, 10 вопросов" },
];

const SELF: PatientFeature[] = [
  { href: "/balance", emoji: "🎡", title: "Колесо баланса", desc: "Самоанализ по 8 сферам жизни" },
  { href: "/cognitive-test", emoji: "🧩", title: "Когнитивный тест", desc: "Около 10 минут, память и внимание" },
];

export default function PatientTests() {
  return (
    <div>
      <BackLink />
      <div className="miniapp-card" style={{ marginBottom: 16 }}>
        <h1>Опросники и тесты</h1>
        <p className="hint">Проходите, когда попросит врач или когда захотите сами.</p>
      </div>

      <h3 className="tests-group-title">Скрининги</h3>
      <FeatureGrid features={SCREENERS} />

      <h3 className="tests-group-title" style={{ marginTop: 20 }}>
        Самонаблюдение
      </h3>
      <FeatureGrid features={SELF} />
    </div>
  );
}
