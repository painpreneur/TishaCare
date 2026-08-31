import { prisma } from "@tishacare/db";
import { SHARING_STATUSES } from "@/lib/careLink";
import { isClinicAdmin } from "@/lib/doctorRole";

export { DOCTOR_NOTE_MAX } from "@/lib/doctorNoteShared";

type DoctorLike = { id: string; clinicId: string | null; role: string };

/** A doctor may message a patient through an active/ending care link of their
 *  own — or, as a clinic admin, through one held by a doctor in their clinic.
 *  A paused link (patient stopped data flow) blocks messages. */
export async function canDoctorMessagePatient(
  doctor: DoctorLike,
  patientId: string,
): Promise<boolean> {
  const ownLink = { doctorId: doctor.id, status: { in: [...SHARING_STATUSES] } };
  const where = isClinicAdmin(doctor)
    ? {
        id: patientId,
        OR: [
          { careLinks: { some: ownLink } },
          {
            careLinks: {
              some: {
                status: { in: [...SHARING_STATUSES] },
                doctor: { clinicId: doctor.clinicId },
              },
            },
          },
        ],
      }
    : { id: patientId, careLinks: { some: ownLink } };

  return (await prisma.patient.count({ where })) > 0;
}
