// How a doctor practises. Stored as a plain string on Doctor.practiceType
// (Prisma schema has no enums); this is the single source of truth for the
// allowed values and the type used across the app.
export const PRACTICE_TYPES = ["clinic", "solo"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export function isPracticeType(value: unknown): value is PracticeType {
  return typeof value === "string" && (PRACTICE_TYPES as readonly string[]).includes(value);
}
