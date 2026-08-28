import { BECK_CODE, BECK_QUESTIONS } from "./clinical";

// Data-driven definition for a sum-of-Likert questionnaire. Covers Beck and,
// later, GAD-7 / ASRS / AQ-10 / MSI-BPD. MDQ keeps its bespoke criteria logic
// in clinical.ts. Interpretation is a set of ascending score bands.

export interface QDefOption {
  label: string;
  value: number;
}
export interface QDefQuestion {
  id: string;
  text: string;
  options: QDefOption[];
}
export interface QDefBand {
  /** Inclusive upper bound of this band. Bands are listed ascending; the last
   *  one is the catch-all (its `max` should equal the questionnaire total). */
  max: number;
  label: string;
  note: string;
}
/** Clinical role of an instrument, used to decide when to offer it:
 *  - intake:      broad screening for/at the first appointment
 *  - diagnostic:  deeper instrument used while establishing a diagnosis
 *  - monitoring:  repeated over time to track a known condition
 *  - self:        non-clinical self-reflection, patient's own use
 *  An instrument can serve several roles (Beck: diagnostic + monitoring). */
export type QuestionnairePhase = "intake" | "diagnostic" | "monitoring" | "self";

export interface QuestionnaireDef {
  code: string;
  title: string;
  description: string;
  disclaimer: string;
  /** Copyright / source line shown under the result, when the instrument
   *  requires attribution. */
  attribution?: string;
  phases: QuestionnairePhase[];
  questions: QDefQuestion[];
  bands: QDefBand[];
}

export function questionnaireMaxScore(def: QuestionnaireDef): number {
  return def.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.value)), 0);
}

export function scoreSum(answers: number[]): number {
  return answers.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function interpretByBands(def: QuestionnaireDef, score: number): { label: string; note: string } {
  const band = def.bands.find((b) => score <= b.max) ?? def.bands[def.bands.length - 1];
  return { label: band.label, note: band.note };
}

// ── Beck (BDI-21) as a QuestionnaireDef ──────────────────────────────────────
// Bands mirror interpretBeck() in clinical.ts (kept there for back-compat).

export const BECK_DEF: QuestionnaireDef = {
  code: BECK_CODE,
  title: "Опросник депрессии Бека",
  description: "Скрининг выраженности депрессивной симптоматики (21 вопрос)",
  phases: ["diagnostic", "monitoring"],
  disclaimer:
    "Опросник Бека: скрининговый инструмент. Результат не является диагнозом; " +
    "интерпретируйте его вместе с врачом.",
  questions: BECK_QUESTIONS.map((q, i) => ({ id: `q${i + 1}`, text: q.text, options: q.options })),
  bands: [
    {
      max: 9,
      label: "отсутствие депрессивных симптомов",
      note: "Признаков депрессии не выявлено. Продолжайте заботиться о своем психическом здоровье.",
    },
    {
      max: 15,
      label: "лёгкая депрессия (субдепрессия)",
      note: "Рекомендуется обратить внимание на режим сна, активность и обсудить состояние с врачом при следующем визите.",
    },
    {
      max: 19,
      label: "умеренная депрессия",
      note: "Рекомендуется в ближайшее время обсудить симптомы с лечащим врачом.",
    },
    {
      max: 29,
      label: "выраженная депрессия (средней тяжести)",
      note: "Рекомендуется срочно связаться с лечащим врачом для коррекции терапии.",
    },
    {
      max: 63,
      label: "тяжёлая депрессия",
      note: "Результат указывает на тяжёлое состояние. Пожалуйста, свяжитесь с врачом как можно скорее.",
    },
  ],
};

// ── GAD-7 (тревога) ─────────────────────────────────────────────────────────
// Pfizer — свободно для использования, воспроизведения и перевода.

const gad7Freq = [
  { label: "Совсем нет", value: 0 },
  { label: "Несколько дней", value: 1 },
  { label: "Более половины дней", value: 2 },
  { label: "Почти каждый день", value: 3 },
];

export const GAD7_CODE = "GAD7";
export const GAD7_DEF: QuestionnaireDef = {
  code: GAD7_CODE,
  title: "GAD-7 (шкала тревоги)",
  description: "Скрининг генерализованного тревожного расстройства (7 вопросов)",
  phases: ["intake", "monitoring"],
  disclaimer:
    "GAD-7: скрининговый инструмент, а не диагноз. Обсудите результат с врачом; " +
    "особенно при выраженной тревоге не откладывайте обращение за помощью.",
  questions: [
    "Чувство нервозности, тревоги или взвинченности",
    "Неспособность остановить беспокойство или контролировать его",
    "Чрезмерное беспокойство по разным поводам",
    "Трудность расслабиться",
    "Такое сильное беспокойство, что трудно усидеть на месте",
    "Лёгкое возникновение раздражения или злости",
    "Чувство страха, будто может случиться что-то ужасное",
  ].map((text, i) => ({ id: `q${i + 1}`, text, options: gad7Freq })),
  bands: [
    { max: 4, label: "минимальная тревога", note: "Значимых признаков тревожного расстройства не выявлено." },
    { max: 9, label: "лёгкая тревога", note: "Стоит понаблюдать за состоянием и упомянуть об этом врачу при следующем визите." },
    { max: 14, label: "умеренная тревога", note: "Рекомендуется в ближайшее время обсудить симптомы с врачом." },
    { max: 21, label: "выраженная тревога", note: "Рекомендуется как можно скорее связаться с врачом." },
  ],
};

// ── ASRS v1.1 Part A (СДВГ у взрослых) ──────────────────────────────────────
// ВОЗ — свободно распространяется. Скрининг: пункт «засчитывается», если ответ
// попадает в «затенённую» зону (для 1–3 — «Иногда/Часто/Очень часто»,
// для 4–6 — «Часто/Очень часто»). Значения опций закодированы как 0/1 по этому
// правилу; сумма ≥ 4 — положительный скрининг.

const asrsShadedFrom = (threshold: number) =>
  ["Никогда", "Редко", "Иногда", "Часто", "Очень часто"].map((label, i) => ({
    label,
    value: i >= threshold ? 1 : 0,
  }));

export const ASRS_CODE = "ASRS_A";
export const ASRS_DEF: QuestionnaireDef = {
  code: ASRS_CODE,
  title: "ASRS v1.1 (скрининг СДВГ, часть A)",
  description: "Скрининг синдрома дефицита внимания и гиперактивности у взрослых (6 вопросов)",
  phases: ["intake"],
  disclaimer:
    "ASRS: скрининг, а не диагноз. Положительный результат означает, что стоит " +
    "обсудить симптомы с врачом; диагноз СДВГ ставится только по итогам очной оценки.",
  questions: [
    { text: "Как часто вам бывает трудно завершить последние детали проекта, когда основная сложная часть уже сделана?", threshold: 2 },
    { text: "Как часто вам трудно привести дела в порядок, когда нужно выполнить задачу, требующую организованности?", threshold: 2 },
    { text: "Как часто вам трудно вовремя вспомнить о встречах или обязательствах?", threshold: 2 },
    { text: "Когда задача требует сосредоточенности, как часто вы избегаете её начинать или откладываете?", threshold: 3 },
    { text: "Как часто вы ёрзаете руками или ногами, когда приходится долго сидеть?", threshold: 3 },
    { text: "Как часто вы чувствуете себя чрезмерно активным, будто «заведённым», словно вами движет мотор?", threshold: 3 },
  ].map((q, i) => ({ id: `q${i + 1}`, text: q.text, options: asrsShadedFrom(q.threshold) })),
  bands: [
    { max: 3, label: "скрининг отрицательный", note: "Выраженных признаков СДВГ по скринингу не выявлено." },
    { max: 6, label: "скрининг положительный", note: "Рекомендуется обсудить симптомы внимания и активности с врачом для очной оценки." },
  ],
};

// ── AQ-10 (черты аутистического спектра) ────────────────────────────────────
// © MRC Cognition and Brain Sciences Unit / Autism Research Centre, Cambridge.
// Балл начисляется за ответ в «спектр-согласованную» сторону; ≥ 6 — рекомендуется
// рассмотреть направление к специалисту.

const aqAgree1 = [
  { label: "Полностью согласен(на)", value: 1 },
  { label: "Скорее согласен(на)", value: 1 },
  { label: "Скорее не согласен(на)", value: 0 },
  { label: "Полностью не согласен(на)", value: 0 },
];
const aqDisagree1 = [
  { label: "Полностью согласен(на)", value: 0 },
  { label: "Скорее согласен(на)", value: 0 },
  { label: "Скорее не согласен(на)", value: 1 },
  { label: "Полностью не согласен(на)", value: 1 },
];

export const AQ10_CODE = "AQ10";
export const AQ10_DEF: QuestionnaireDef = {
  code: AQ10_CODE,
  title: "AQ-10 (скрининг черт аутистического спектра)",
  description: "Короткий скрининг признаков расстройств аутистического спектра (10 утверждений)",
  phases: ["intake"],
  disclaimer:
    "AQ-10: короткий скрининг, а не диагноз. Он не валидирован для русскоязычной " +
    "популяции в этой реализации. Результат имеет смысл обсуждать только со специалистом.",
  attribution: "AQ-10 © MRC Cognition and Brain Sciences Unit / Autism Research Centre, Cambridge.",
  questions: [
    { text: "Я часто замечаю тихие звуки, которых другие не слышат.", opts: aqAgree1 },
    { text: "Обычно я больше сосредоточен(а) на картине в целом, чем на мелких деталях.", opts: aqDisagree1 },
    { text: "Мне легко делать несколько дел одновременно.", opts: aqDisagree1 },
    { text: "Если меня прерывают, я легко и быстро возвращаюсь к тому, чем занимался(ась).", opts: aqDisagree1 },
    { text: "Мне легко «читать между строк», когда со мной разговаривают.", opts: aqDisagree1 },
    { text: "Я замечаю, когда собеседнику становится скучно со мной.", opts: aqDisagree1 },
    { text: "Читая художественную книгу, мне трудно представить характеры персонажей.", opts: aqAgree1 },
    { text: "Мне нравится собирать информацию о категориях вещей (типы машин, птиц, поездов, растений).", opts: aqAgree1 },
    { text: "Мне трудно понять чувства человека по выражению его лица.", opts: aqAgree1 },
    { text: "Мне трудно понять намерения других людей.", opts: aqAgree1 },
  ].map((q, i) => ({ id: `q${i + 1}`, text: q.text, options: q.opts })),
  bands: [
    { max: 5, label: "ниже порога направления", note: "По скринингу выраженных признаков спектра не выявлено." },
    { max: 10, label: "выше порога направления", note: "Рекомендуется обсудить со специалистом целесообразность углублённой оценки." },
  ],
};

// ── MSI-BPD (скрининг ПРЛ) ──────────────────────────────────────────────────
// Zanarini M.C. et al., 2003. Да = 1; ≥ 7 «да» — положительный скрининг.

const yesNo1 = [
  { label: "Да", value: 1 },
  { label: "Нет", value: 0 },
];

export const MSI_BPD_CODE = "MSI_BPD";
export const MSI_BPD_DEF: QuestionnaireDef = {
  code: MSI_BPD_CODE,
  title: "MSI-BPD (скрининг пограничного расстройства)",
  description: "Скрининг признаков пограничного расстройства личности (10 вопросов)",
  phases: ["intake"],
  disclaimer:
    "MSI-BPD: скрининг, а не диагноз, и не заменяет очную оценку. Если какие-то " +
    "из этих вопросов отзываются тяжело, обсудите это со своим врачом.",
  attribution: "MSI-BPD (Zanarini M.C. et al., 2003).",
  questions: [
    "Были ли ваши близкие отношения бурными, полными конфликтов, частых разрывов и воссоединений?",
    "Причиняли ли вы себе намеренно вред (порезы, ожоги) или пытались покончить с собой?",
    "Было ли ещё как минимум два импульсивных поступка, способных навредить вам (рискованное вождение, злоупотребление веществами, переедание, безответственные траты, рискованный секс)?",
    "Часто ли у вас бывает крайне переменчивое настроение?",
    "Часто ли вы испытываете сильный гнев или ведёте себя настолько гневно, что это создаёт проблемы?",
    "Часто ли вас одолевает подозрительность к людям или ощущение оторванности от собственного тела или окружающего мира?",
    "Часто ли вы прикладываете отчаянные усилия, чтобы вас не бросили и не покинули?",
    "Часто ли вы ощущаете внутри пустоту?",
    "Часто ли вам кажется, что вы не знаете, кто вы, или что у вас нет собственного «я»?",
    "Бывали ли периоды сильного стресса, когда вы теряли связь с реальностью или чувствовали себя очень «на грани»?",
  ].map((text, i) => ({ id: `q${i + 1}`, text, options: yesNo1 })),
  bands: [
    { max: 6, label: "скрининг отрицательный", note: "Значимых признаков по скринингу не выявлено." },
    { max: 10, label: "скрининг положительный", note: "Рекомендуется очная оценка у специалиста для уточнения." },
  ],
};

export const QUESTIONNAIRE_DEFS: Record<string, QuestionnaireDef> = {
  [BECK_DEF.code]: BECK_DEF,
  [GAD7_DEF.code]: GAD7_DEF,
  [ASRS_DEF.code]: ASRS_DEF,
  [AQ10_DEF.code]: AQ10_DEF,
  [MSI_BPD_DEF.code]: MSI_BPD_DEF,
};

export function questionnaireDef(code: string): QuestionnaireDef | null {
  return QUESTIONNAIRE_DEFS[code] ?? null;
}
