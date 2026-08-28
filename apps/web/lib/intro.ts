// First-run intro, shown once per device before the consent step and only to
// patients who have not consented yet (see PatientHome's gate). Motivational
// framing only; the consent + profile flow it leads into does not depend on
// this copy.
//
// "Тиша" is the app's guide, a beaver: methodical, unhurried, builds the
// picture from small regular entries. It keeps the clinical frame: it helps
// you notice and record your state, together with your doctor. It never
// promises outcomes, never jokes about symptoms, and always defers to the
// doctor.
//
// Copy style: no em dash "—" (and no en dash "–") anywhere in user-facing
// text. Use commas, colons, parentheses or separate sentences instead.
export const INTRO_SEEN_KEY = "tc_intro_seen_v1";

export interface IntroStep {
  emoji: string;
  title: string;
  body: string;
}

export const INTRO_STEPS: IntroStep[] = [
  {
    emoji: "🦫",
    title: "Привет! Я Тиша",
    body:
      "Помогу вести короткие записи о состоянии: понемногу, но каждый день. " +
      "Из мелких заметок со временем складывается общая картина.",
  },
  {
    emoji: "📈",
    title: "Зачем это",
    body:
      "Настроение, сон, энергия, приём препаратов. Если отмечать их каждый день, " +
      "со временем видно закономерности: что поддерживает, а что выбивает из колеи.",
  },
  {
    emoji: "🩺",
    title: "Вместе с врачом",
    body:
      "Ваши записи видит лечащий врач, если вы дали согласие и подключили его. " +
      "Это не диагноз и не замена приёму, а общий язык между визитами.",
  },
  {
    emoji: "📋",
    title: "Опросники по желанию",
    body:
      "Иногда я предложу короткий опросник про тревогу, настроение или внимание. " +
      "Это самонаблюдение, а не экзамен: результат остаётся у вас и, при согласии, у врача.",
  },
  {
    emoji: "🔒",
    title: "Доступом управляете вы",
    body:
      "Вы решаете, кто из врачей видит записи, и можете отключить доступ в любой момент. " +
      "Следующий шаг: короткое согласие на обработку данных.",
  },
];

export const INTRO_CTA = "Перейти к согласию";
