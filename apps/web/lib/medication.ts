export const MED_STATUSES = ["active", "stopped", "switched"] as const;
export type MedStatus = (typeof MED_STATUSES)[number];

export const MED_STATUS_LABEL: Record<MedStatus, string> = {
  active: "Принимается",
  stopped: "Отменён",
  switched: "Заменён",
};

export const PRESCRIBER_LABEL: Record<string, string> = {
  self: "по своей инициативе",
  doctor: "назначил врач",
  external: "назначено вне системы",
};

// Common side-effect tags for the patient report form.
export const SIDE_EFFECT_TAGS: { id: string; label: string }[] = [
  { id: "nausea", label: "Тошнота" },
  { id: "drowsiness", label: "Сонливость" },
  { id: "insomnia", label: "Бессонница" },
  { id: "tremor", label: "Тремор" },
  { id: "weight", label: "Изменение веса" },
  { id: "appetite", label: "Аппетит" },
  { id: "sexual", label: "Сексуальная сфера" },
  { id: "headache", label: "Головная боль" },
  { id: "dizziness", label: "Головокружение" },
  { id: "gi", label: "ЖКТ" },
];

export const SIDE_EFFECT_TAG_LABEL: Record<string, string> = Object.fromEntries(
  SIDE_EFFECT_TAGS.map((t) => [t.id, t.label])
);

export function tagsToLabels(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => SIDE_EFFECT_TAG_LABEL[t] ?? t);
}

/** A report where the patient rated tolerability poorly. */
export function isPoorlyTolerated(tolerability: number | null | undefined): boolean {
  return typeof tolerability === "number" && tolerability <= 2;
}
