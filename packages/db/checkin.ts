// Shared vocabulary for check-ins: momentary state tags and the 3-state
// medication answer. Used by the check-in form, the API validation, the
// chart tooltip, the doctor card and the Telegram bot's keyboard flow.
// Pure data — safe for the client bundle and for @tishacare/bot-core.

/** Mood scale, worst -> best. Shared by the Mini App form and the bot. */
export const MOOD_SCALE: { emoji: string; value: number }[] = [
  { emoji: "😞", value: -2 },
  { emoji: "🙁", value: -1 },
  { emoji: "😐", value: 0 },
  { emoji: "🙂", value: 1 },
  { emoji: "😄", value: 2 },
];

export const MOOD_EMOJI: Record<number, string> = Object.fromEntries(
  MOOD_SCALE.map((m) => [m.value, m.emoji]),
);

export interface StateTag {
  id: string;
  label: string;
}

// Quality of the state right now, beyond the good <-> bad mood axis. A person
// in a manic evening may rate mood +2; the "activated" tag is what tells the
// doctor that apart from "+2, calm and content".
export const STATE_TAGS: StateTag[] = [
  { id: "calm", label: "Спокойно" },
  { id: "anxious", label: "Тревожно" },
  { id: "activated", label: "Разогнан(а)" },
  { id: "slowed", label: "Заторможенно" },
  { id: "irritable", label: "Раздражённо" },
  { id: "mixed", label: "«Качает»" },
];

export const STATE_TAG_IDS = STATE_TAGS.map((t) => t.id);

// Tags that read as elevation / mixed features — the chart marks these points.
export const ACTIVATION_TAG_IDS = ["activated", "mixed"];

const TAG_LABEL = new Map(STATE_TAGS.map((t) => [t.id, t.label]));

export function parseStateTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function stateTagLabels(ids: string[]): string[] {
  return ids.map((id) => TAG_LABEL.get(id) ?? id);
}

export type MedsStatus = "yes" | "no" | "partial";

export const MEDS_OPTIONS: { id: MedsStatus; label: string }[] = [
  { id: "yes", label: "Да" },
  { id: "partial", label: "Частично" },
  { id: "no", label: "Нет" },
];

export const MEDS_LABEL: Record<MedsStatus, string> = {
  yes: "приняты",
  partial: "частично",
  no: "не приняты",
};

// 1 / 0.5 / 0 for correlation math; null when unanswered.
export function medsToNumber(status: string | null): number | null {
  if (status === "yes") return 1;
  if (status === "partial") return 0.5;
  if (status === "no") return 0;
  return null;
}

export const NOTE_MAX_LENGTH = 500;
