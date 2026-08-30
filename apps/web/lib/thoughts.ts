// Vocabulary for the thought diary ("Дневник мыслей"). A free note or a short
// thought record; either can carry a few emotion tags and a 0..10 strength.
// Pure data — used by the patient screen, the API validation and the doctor
// card.

export type ThoughtKind = "free" | "guided";

export interface Emotion {
  id: string;
  label: string;
}

// Kept short and plain — enough to give the entry (and the doctor) a handle,
// not a full affect checklist.
export const EMOTIONS: Emotion[] = [
  { id: "anxiety", label: "Тревога" },
  { id: "sadness", label: "Грусть" },
  { id: "anger", label: "Злость" },
  { id: "shame", label: "Стыд" },
  { id: "guilt", label: "Вина" },
  { id: "fear", label: "Страх" },
  { id: "calm", label: "Спокойствие" },
  { id: "joy", label: "Радость" },
];

export const EMOTION_IDS = EMOTIONS.map((e) => e.id);
const EMOTION_LABEL = new Map(EMOTIONS.map((e) => [e.id, e.label]));

export function parseEmotions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string" && EMOTION_IDS.includes(x))
      : [];
  } catch {
    return [];
  }
}

export function emotionLabels(ids: string[]): string[] {
  return ids.map((id) => EMOTION_LABEL.get(id) ?? id);
}

export const THOUGHT_MAX_LENGTH = 2000;

/** Validate + normalise the thought fields from a request body, ready to write
 *  to the DB. Shared by POST /thoughts and PATCH /thoughts/[id]. */
export function readThoughtFields(body: Record<string, unknown>) {
  const kind: ThoughtKind = body.kind === "guided" ? "guided" : "free";
  const clip = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, THOUGHT_MAX_LENGTH) : "");

  const content = clip(body.content);
  const situation = kind === "guided" ? clip(body.situation) : "";
  const reframe = kind === "guided" ? clip(body.reframe) : "";

  const rawEmotions = Array.isArray(body.emotions) ? body.emotions : [];
  const emotions = [...new Set(rawEmotions)].filter(
    (e): e is string => typeof e === "string" && EMOTION_IDS.includes(e),
  );

  let intensity: number | null = null;
  if (body.intensity != null) {
    const n = Math.round(Number(body.intensity));
    if (Number.isFinite(n) && n >= 0 && n <= 10) intensity = n;
  }

  return {
    kind,
    // `content` is a required column: the free note, or the thought in a guided
    // record. Callers reject an empty one.
    content,
    situation: situation || null,
    reframe: reframe || null,
    emotions: emotions.length ? JSON.stringify(emotions) : null,
    intensity,
  };
}

// The guided prompts, in order. `key` maps to the Thought field.
export const GUIDED_STEPS: { key: "situation" | "content" | "reframe"; label: string; placeholder: string }[] = [
  {
    key: "situation",
    label: "Что случилось?",
    placeholder: "Ситуация или повод. Коротко, без оценок.",
  },
  {
    key: "content",
    label: "Какая мысль пришла?",
    placeholder: "Первая автоматическая мысль, как она звучала в голове.",
  },
  {
    key: "reframe",
    label: "Как ещё можно на это посмотреть?",
    placeholder: "Другой взгляд. Не обязательно позитивный, просто иной. Можно пропустить.",
  },
];
