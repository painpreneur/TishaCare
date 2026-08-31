import { NextResponse } from "next/server";

// A clinic's licence gates its doctors' write access. When it is switched off
// (Clinic.licenseActive = false) the panel stays readable but every clinical
// mutation is refused, server-side, until it is restored. A solo doctor
// (clinicId = null) has no clinic and is never gated.

/** The doctor shape getCurrentDoctor() returns — Doctor plus its clinic. */
type DoctorWithClinic = {
  clinicId: string | null;
  clinic: { licenseActive: boolean } | null;
};

export function clinicLicenseInactive(doctor: DoctorWithClinic): boolean {
  return doctor.clinicId != null && doctor.clinic?.licenseActive === false;
}

export const LICENSE_INACTIVE_MESSAGE =
  "Лицензия клиники неактивна. Пока она не восстановлена, панель доступна только для просмотра.";

/** Guard for doctor mutation routes: call right after the auth check and
 *  `return` the result when it is non-null. */
export function licenseGate(doctor: DoctorWithClinic): NextResponse | null {
  return clinicLicenseInactive(doctor)
    ? NextResponse.json({ error: LICENSE_INACTIVE_MESSAGE }, { status: 403 })
    : null;
}
