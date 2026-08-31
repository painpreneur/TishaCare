// A doctor's role inside a clinic. Stored as a plain string on Doctor.role
// (Prisma schema has no enums); this is the single source of truth for the
// allowed values and the type used across the app. Mirrors lib/practiceType.ts.
export const DOCTOR_ROLES = ["admin", "member"] as const;
export type DoctorRole = (typeof DOCTOR_ROLES)[number];

export function isDoctorRole(value: unknown): value is DoctorRole {
  return typeof value === "string" && (DOCTOR_ROLES as readonly string[]).includes(value);
}

/** True only for a clinic doctor with the admin role. A solo doctor
 *  (clinicId = null) is never a clinic admin, whatever `role` says. */
export function isClinicAdmin(doctor: { clinicId: string | null; role: string }): boolean {
  return doctor.clinicId != null && doctor.role === "admin";
}
