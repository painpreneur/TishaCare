export const COGNITIVE_TEST_CODE = "COGTEST";
export const COGNITIVE_TEST_TITLE = "Когнитивный тест (батарея из 9 субтестов)";
export const COGNITIVE_TEST_MAX_SCORE = 100;

export type CognitiveCategory =
  | "memory"
  | "attention"
  | "thinking"
  | "spatial"
  | "speech"
  | "regulation"
  | "state";

export const CATEGORY_LABELS: Record<CognitiveCategory, string> = {
  memory: "Память",
  attention: "Внимание",
  thinking: "Мышление",
  spatial: "Пространственная ориентация",
  speech: "Речь",
  regulation: "Регуляция и контроль",
  state: "Психологическое состояние",
};

// --- Память: заучивание 10 слов (методика Лурии), используется и для
// немедленного, и для отсроченного воспроизведения.
export const MEMORY_WORD_LIST: string[] = [
  "рамка",
  "стиль",
  "тупик",
  "букет",
  "склон",
  "игрок",
  "топор",
  "шкаф",
  "живот",
  "суть",
];

export const MEMORY_DISTRACTOR_WORDS: string[] = [
  "ремень",
  "полка",
  "овраг",
  "поднос",
  "хребет",
  "судья",
  "молот",
  "стол",
  "палец",
  "смысл",
];

// --- Внимание: серийное вычитание (проба Крепелина)
export const SERIAL_SEVENS_SEED = 62;
export const SERIAL_SEVENS_STEP = 7;
export const SERIAL_SEVENS_COUNT = 5;

export function serialSevensCorrectSequence(): number[] {
  const result: number[] = [];
  let value = SERIAL_SEVENS_SEED;
  for (let i = 0; i < SERIAL_SEVENS_COUNT; i++) {
    value -= SERIAL_SEVENS_STEP;
    result.push(value);
  }
  return result;
}

// --- Внимание: таблица Шульте (числа 1..25 по порядку)
export const SCHULTE_GRID_SIZE = 25;

// --- Мышление: методика "существенные признаки" (С.Я. Рубинштейн)
export interface AnalogyItem {
  id: string;
  concept: string;
  options: string[];
  correct: [string, string];
}

export const ANALOGY_ITEMS: AnalogyItem[] = [
  {
    id: "garden",
    concept: "Сад",
    options: ["Растения", "Садовник", "Собака", "Забор", "Земля", "Скамейка"],
    correct: ["Растения", "Земля"],
  },
  {
    id: "river",
    concept: "Река",
    options: ["Берег", "Рыба", "Тина", "Вода", "Рыболов", "Лодка"],
    correct: ["Берег", "Вода"],
  },
  {
    id: "game",
    concept: "Игра",
    options: ["Игроки", "Шашки", "Шахматы", "Наказание", "Правила", "Судья"],
    correct: ["Игроки", "Правила"],
  },
  {
    id: "reading",
    concept: "Чтение",
    options: ["Глаза", "Книга", "Картинка", "Печать", "Слово", "Очки"],
    correct: ["Глаза", "Печать"],
  },
  {
    id: "war",
    concept: "Война",
    options: ["Самолёт", "Пушки", "Сражения", "Ружья", "Солдаты", "Знамя"],
    correct: ["Сражения", "Солдаты"],
  },
];

// --- Пространственная ориентация: сравнение узоров (без внешних картинок,
// узоры кодируются как сетка цветовых id и рендерятся цветными клетками).
export type SpatialColorId = "r" | "g" | "b" | "y" | "p";

export interface SpatialOption {
  id: string;
  pattern: SpatialColorId[][];
  isMatch: boolean;
}

export interface SpatialItem {
  id: string;
  targetPattern: SpatialColorId[][];
  options: SpatialOption[];
}

const grid = (rows: string): SpatialColorId[][] =>
  rows
    .trim()
    .split("\n")
    .map((row) => row.trim().split("") as SpatialColorId[]);

export const SPATIAL_ITEMS: SpatialItem[] = [
  {
    id: "pattern-1",
    targetPattern: grid(`
      rgb
      ybp
      grp
    `),
    options: [
      { id: "a", pattern: grid(`rgb\nybp\ngrp`), isMatch: true },
      { id: "b", pattern: grid(`rgb\nybp\ngrb`), isMatch: false },
      { id: "c", pattern: grid(`rgb\nypb\ngrp`), isMatch: false },
      { id: "d", pattern: grid(`gbr\nybp\ngrp`), isMatch: false },
    ],
  },
  {
    id: "pattern-2",
    targetPattern: grid(`
      pgy
      rbg
      ypr
    `),
    options: [
      { id: "a", pattern: grid(`pgy\nrbp\nypr`), isMatch: false },
      { id: "b", pattern: grid(`pgy\nrbg\nypr`), isMatch: true },
      { id: "c", pattern: grid(`pyg\nrbg\nypr`), isMatch: false },
      { id: "d", pattern: grid(`pgy\nrbg\nyrp`), isMatch: false },
    ],
  },
];

// --- Речь: вербальная беглость (слова на заданную букву)
export const FLUENCY_LETTER = "К";
export const FLUENCY_SECONDS = 60;

// --- Регуляция и контроль: визуальный go/no-go (замена аудио-варианта —
// см. README, раздел про сознательные отличия от оригинала)
export const GO_NO_GO_TARGET_LETTER = "И";
export const GO_NO_GO_LETTER_POOL: string[] = ["А", "И", "О", "У", "Е", "И", "Ы", "И", "Э", "И", "Я", "И"];
export const GO_NO_GO_INTERVAL_MS = 1200;

// --- Психологическое состояние: цветовой тест Люшера (упрощённая версия)
export interface LuscherColor {
  id: string;
  hex: string;
  label: string;
}

export const LUSCHER_COLORS: LuscherColor[] = [
  { id: "grey", hex: "#8d8d8d", label: "Серый" },
  { id: "blue", hex: "#2f4f9e", label: "Синий" },
  { id: "green", hex: "#2e7d52", label: "Зелёный" },
  { id: "red", hex: "#c73a3a", label: "Красный" },
  { id: "yellow", hex: "#e0b93c", label: "Жёлтый" },
  { id: "violet", hex: "#7e4f9e", label: "Фиолетовый" },
  { id: "brown", hex: "#7a5443", label: "Коричневый" },
  { id: "black", hex: "#2b2b2b", label: "Чёрный" },
];

/**
 * "Аутогенная норма" по Люшеру — эталонный порядок предпочтений для
 * психологически уравновешенного состояния. Используется только для
 * упрощённого эвристического индекса отклонения, не для полной клинической
 * интерпретации 8-цветового теста.
 */
export const LUSCHER_AUTOGENIC_NORM: string[] = [
  "red",
  "yellow",
  "green",
  "violet",
  "blue",
  "brown",
  "grey",
  "black",
];

// --- Результаты субтестов, которые собирает Mini App ---

export interface MemorySubtestResult {
  selected: string[];
  correctCount: number;
}

export interface SerialSevensResult {
  entered: number[];
  correctCount: number;
}

export interface SchulteResult {
  totalTimeMs: number;
  errors: number;
}

export interface AnalogiesResult {
  correctCount: number;
  total: number;
}

export interface SpatialResult {
  correctCount: number;
  total: number;
}

export interface FluencyResult {
  letter: string;
  words: string[];
  count: number;
}

export interface GoNoGoResult {
  totalTargets: number;
  hits: number;
  falseAlarms: number;
  misses: number;
  avgReactionMs: number;
}

export interface LuscherResult {
  order: string[];
}

export interface CognitiveTestSubmission {
  memoryImmediate: MemorySubtestResult;
  attentionSerialSevens: SerialSevensResult;
  attentionSchulte: SchulteResult;
  thinkingAnalogies: AnalogiesResult;
  spatial: SpatialResult;
  verbalFluency: FluencyResult;
  regulation: GoNoGoResult;
  psychState: LuscherResult;
  memoryDelayed: MemorySubtestResult;
}

export type CognitiveLevel = "Норма" | "Низкий" | "Выше нормы" | "Обратите внимание";

export interface CategoryScore {
  category: CognitiveCategory;
  label: string;
  raw: number;
  max: number;
  level: CognitiveLevel;
}

export interface CognitiveTestInterpretation {
  overallScore: number;
  categories: CategoryScore[];
  summary: string;
  disclaimer: string;
}

const DISCLAIMER =
  "Результат носит ориентировочный, скрининговый характер и не является клиническим диагнозом. " +
  "Пороговые значения не валидированы специалистом, для точной диагностики нужна очная консультация.";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Эвристические, явно не клинически валидированные пороги (MVP). */
function levelFromRatio(ratio: number): CognitiveLevel {
  if (ratio >= 0.9) return "Выше нормы";
  if (ratio >= 0.7) return "Норма";
  if (ratio >= 0.4) return "Обратите внимание";
  return "Низкий";
}

function memoryRatio(s: CognitiveTestSubmission): number {
  const immediate = s.memoryImmediate.correctCount / MEMORY_WORD_LIST.length;
  const delayed = s.memoryDelayed.correctCount / MEMORY_WORD_LIST.length;
  return clamp((immediate + delayed) / 2, 0, 1);
}

function attentionRatio(s: CognitiveTestSubmission): number {
  const sevensRatio = clamp(s.attentionSerialSevens.correctCount / SERIAL_SEVENS_COUNT, 0, 1);
  const errorFactor = clamp(1 - s.attentionSchulte.errors / SCHULTE_GRID_SIZE, 0, 1);
  const timeFactor = clamp(1 - (s.attentionSchulte.totalTimeMs - 30000) / 120000, 0, 1);
  const schulteRatio = clamp((errorFactor + timeFactor) / 2, 0, 1);
  return clamp((sevensRatio + schulteRatio) / 2, 0, 1);
}

function thinkingRatio(s: CognitiveTestSubmission): number {
  return clamp(s.thinkingAnalogies.correctCount / Math.max(s.thinkingAnalogies.total, 1), 0, 1);
}

function spatialRatio(s: CognitiveTestSubmission): number {
  return clamp(s.spatial.correctCount / Math.max(s.spatial.total, 1), 0, 1);
}

function speechRatio(s: CognitiveTestSubmission): number {
  return clamp(s.verbalFluency.count / 10, 0, 1);
}

function regulationRatio(s: CognitiveTestSubmission): number {
  const { totalTargets, hits, falseAlarms } = s.regulation;
  return clamp((hits - falseAlarms) / Math.max(totalTargets, 1), 0, 1);
}

function stateRatio(s: CognitiveTestSubmission): number {
  const order = s.psychState.order;
  let deviation = 0;
  let maxDeviation = 0;
  LUSCHER_AUTOGENIC_NORM.forEach((colorId, normPos) => {
    const actualPos = order.indexOf(colorId);
    const diff = actualPos === -1 ? LUSCHER_AUTOGENIC_NORM.length : Math.abs(actualPos - normPos);
    deviation += diff;
    maxDeviation += Math.max(normPos, LUSCHER_AUTOGENIC_NORM.length - 1 - normPos);
  });
  return clamp(1 - deviation / Math.max(maxDeviation, 1), 0, 1);
}

const CATEGORY_RATIOS: { category: CognitiveCategory; ratio: (s: CognitiveTestSubmission) => number; max: number }[] = [
  { category: "memory", ratio: memoryRatio, max: MEMORY_WORD_LIST.length * 2 },
  { category: "attention", ratio: attentionRatio, max: 100 },
  { category: "thinking", ratio: thinkingRatio, max: 100 },
  { category: "spatial", ratio: spatialRatio, max: 100 },
  { category: "speech", ratio: speechRatio, max: 10 },
  { category: "regulation", ratio: regulationRatio, max: 100 },
  { category: "state", ratio: stateRatio, max: 100 },
];

export function interpretCognitiveTest(submission: CognitiveTestSubmission): CognitiveTestInterpretation {
  const categories: CategoryScore[] = CATEGORY_RATIOS.map(({ category, ratio, max }) => {
    const r = ratio(submission);
    return {
      category,
      label: CATEGORY_LABELS[category],
      raw: Math.round(r * max),
      max,
      level: levelFromRatio(r),
    };
  });

  const overallScore = Math.round(
    (categories.reduce((sum, c) => sum + c.raw / c.max, 0) / categories.length) * 100
  );

  const concerning = categories.filter((c) => c.level === "Низкий" || c.level === "Обратите внимание");
  const summary =
    concerning.length === 0
      ? "Показатели по всем категориям в пределах нормы."
      : `Стоит обратить внимание на: ${concerning.map((c) => c.label.toLowerCase()).join(", ")}.`;

  return { overallScore, categories, summary, disclaimer: DISCLAIMER };
}

export function cognitiveTestScore(interpretation: CognitiveTestInterpretation): number {
  return interpretation.overallScore;
}
