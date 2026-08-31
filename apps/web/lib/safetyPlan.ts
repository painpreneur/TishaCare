// Shape and copy for the patient's "plan for a hard moment". Pure data, safe
// for the client bundle. Three free-text fields the patient fills in; the
// emergency numbers below are fixed and always shown.

export const SAFETY_PLAN_FIELDS = ["warningSigns", "copingSteps", "contacts"] as const;
export type SafetyPlanField = (typeof SAFETY_PLAN_FIELDS)[number];

export const SAFETY_PLAN_FIELD_LABEL: Record<SafetyPlanField, string> = {
  warningSigns: "Как я понимаю, что становится хуже",
  copingSteps: "Что мне помогает",
  contacts: "Кому я могу написать или позвонить",
};

export const SAFETY_PLAN_FIELD_HINT: Record<SafetyPlanField, string> = {
  warningSigns:
    "Мысли, ощущения, поступки, которые обычно появляются перед спадом. Например: перестаю спать, отменяю встречи, всё раздражает.",
  copingSteps:
    "Простые вещи, которые немного облегчают состояние. Например: выйти на улицу, позвонить сестре, лечь пораньше, написать врачу.",
  contacts:
    "Имя и как связаться. Один-два человека, которым можно написать в трудный момент.",
};

export const SAFETY_FIELD_MAX = 1000;

export const SAFETY_EMERGENCY_CONTACTS: { label: string; value: string }[] = [
  { label: "Скорая помощь", value: "103 (с мобильного) или 112" },
  { label: "Телефон доверия, круглосуточно и бесплатно", value: "8-800-2000-122" },
];

export interface SafetyPlanDto {
  warningSigns: string | null;
  copingSteps: string | null;
  contacts: string | null;
  updatedAt: string | null;
}

export function isSafetyPlanEmpty(p: SafetyPlanDto | null): boolean {
  return !p || SAFETY_PLAN_FIELDS.every((f) => !p[f]);
}
