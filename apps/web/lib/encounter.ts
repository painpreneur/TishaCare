export const ENCOUNTER_TYPES = ["visit", "consult", "phone", "note"] as const;
export type EncounterType = (typeof ENCOUNTER_TYPES)[number];

export const ENCOUNTER_TYPE_LABEL: Record<EncounterType, string> = {
  visit: "Приём",
  consult: "Консультация",
  phone: "Телефон",
  note: "Заметка",
};

export function isEncounterType(v: unknown): v is EncounterType {
  return typeof v === "string" && (ENCOUNTER_TYPES as readonly string[]).includes(v);
}

export const ENCOUNTER_FIELDS = ["complaints", "observations", "assessment", "plan", "note"] as const;

export const ENCOUNTER_FIELD_LABEL: Record<(typeof ENCOUNTER_FIELDS)[number], string> = {
  complaints: "Жалобы",
  observations: "Статус / наблюдения",
  assessment: "Оценка",
  plan: "План",
  note: "Заметка",
};
