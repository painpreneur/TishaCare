import { cookies } from "next/headers";
import { prisma } from "@mindsteady/db";
import { SESSION_COOKIE } from "./sessionCookie";

export { SESSION_COOKIE };

export async function getCurrentDoctor() {
  const doctorId = cookies().get(SESSION_COOKIE)?.value;
  if (!doctorId) return null;

  return prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { clinic: true },
  });
}
