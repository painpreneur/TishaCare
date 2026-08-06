import { cookies } from "next/headers";
import { prisma } from "@mindsteady/db";

export const SESSION_COOKIE = "doctorId";

export async function getCurrentDoctor() {
  const doctorId = cookies().get(SESSION_COOKIE)?.value;
  if (!doctorId) return null;

  return prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { clinic: true },
  });
}
