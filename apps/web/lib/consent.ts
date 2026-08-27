// Data-processing consent shown to patients during Mini App onboarding.
//
// DRAFT COPY — placeholder pilot wording. Have the clinic / legal review it
// before onboarding real patients. The mechanism (a version + timestamp on
// Patient) does not depend on the exact text: when the text changes
// materially, bump CONSENT_VERSION and every patient is re-prompted on their
// next visit.
export const CONSENT_VERSION = "2026-08-27";

export const CONSENT_TEXT: { heading: string; body: string }[] = [
  {
    heading: "Что это",
    body: "TishaCare помогает вашему врачу наблюдать за вашим состоянием между визитами. Это не замена врача и не средство экстренной помощи.",
  },
  {
    heading: "Какие данные собираются",
    body: "Ежедневные отметки самочувствия (настроение, сон, энергия, приём лекарств), результаты опросников и когнитивных тестов, записи дневника мыслей и — если вы им пользуетесь — переписка с чат-ассистентом.",
  },
  {
    heading: "Кто их видит",
    body: "Ваш лечащий врач и уполномоченные сотрудники вашей клиники — для наблюдения и корректировки лечения. Для других целей данные третьим лицам не передаются.",
  },
  {
    heading: "Хранение и отзыв согласия",
    body: "Данные хранятся, пока вы наблюдаетесь в клинике. Вы можете в любой момент отозвать согласие и запросить удаление данных, сообщив об этом своему врачу.",
  },
  {
    heading: "Если вам плохо",
    body: "При ухудшении состояния или мыслях о причинении вреда себе немедленно обратитесь к врачу или на горячую линию психологической помощи — не ждите ответа в приложении.",
  },
];
