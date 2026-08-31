import { prisma, type Prisma } from "@tishacare/db";
import { DOCTOR_VISIBLE_STATUSES } from "@/lib/careLink";
import { isClinicAdmin } from "@/lib/doctorRole";

// Who a doctor may see and act on:
//  - any doctor: patients they hold a live care link to;
//  - additionally, a clinic admin: any patient a doctor *in their clinic* holds
//    a live care link to — so care isn't dropped when a colleague is
//    deactivated or away.

type DoctorLike = { id: string; clinicId: string | null; role: string };

/** A `where` fragment for `prisma.patient.*` scoping to what `doctor` may see. */
export function patientAccessWhere(doctor: DoctorLike): Prisma.PatientWhereInput {
  const ownLink = {
    careLinks: { some: { doctorId: doctor.id, status: { in: [...DOCTOR_VISIBLE_STATUSES] } } },
  };
  if (isClinicAdmin(doctor)) {
    return {
      OR: [
        ownLink,
        {
          careLinks: {
            some: {
              status: { in: [...DOCTOR_VISIBLE_STATUSES] },
              doctor: { clinicId: doctor.clinicId },
            },
          },
        },
      ],
    };
  }
  return ownLink;
}

/** True if `doctor` may act on this patient (write paths use this before a mutation). */
export async function canDoctorAccessPatient(doctor: DoctorLike, patientId: string): Promise<boolean> {
  const count = await prisma.patient.count({
    where: { id: patientId, ...patientAccessWhere(doctor) },
  });
  return count > 0;
}
