import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@tishacare/db";
import { PATIENT_SESSION_COOKIE } from "./patientSessionCookie";

export { PATIENT_SESSION_COOKIE };

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// The cookie carries the raw token; the DB stores only its hash, so reading the
// PatientSession table never yields a usable credential.
function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a fresh patient session row and returns the cookie value + its expiry. */
export async function createPatientSession(patientId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.patientSession.create({ data: { id: tokenHash(token), patientId, expiresAt } });
  return { token, expiresAt };
}

/**
 * Resolves the request's patient session cookie to a Patient, or null. An
 * expired session is deleted in passing. This is the real auth gate for the
 * /app web portal; middleware only does a cheap "is a cookie present" redirect.
 */
export async function getCurrentPatient() {
  const token = cookies().get(PATIENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.patientSession.findUnique({
    where: { id: tokenHash(token) },
    include: { patient: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.patientSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.patient;
}

/** Revokes one patient session (logout). No-op if the token is missing or unknown. */
export async function destroyPatientSession(token: string | undefined) {
  if (!token) return;
  await prisma.patientSession.delete({ where: { id: tokenHash(token) } }).catch(() => {});
}
