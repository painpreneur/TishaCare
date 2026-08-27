import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@tishacare/db";
import { SESSION_COOKIE } from "./sessionCookie";

export { SESSION_COOKIE };

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// The cookie carries the raw token; the DB stores only its hash, so reading the
// Session table (a leak, a backup, a curious query) never yields a usable
// credential.
function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a fresh session row and returns the cookie value + its expiry. */
export async function createSession(doctorId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: tokenHash(token), doctorId, expiresAt } });
  return { token, expiresAt };
}

/**
 * Resolves the request's session cookie to a Doctor (with clinic), or null.
 * An expired session is deleted in passing. This is the real auth gate —
 * middleware only does a cheap "is a cookie present" redirect.
 */
export async function getCurrentDoctor() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: tokenHash(token) },
    include: { doctor: { include: { clinic: true } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.doctor;
}

/** Revokes one session (logout). No-op if the token is missing or unknown. */
export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.session.delete({ where: { id: tokenHash(token) } }).catch(() => {});
}

/** Revokes every session for a doctor (password change, offboarding, "sign out everywhere"). */
export async function destroyAllSessionsForDoctor(doctorId: string) {
  await prisma.session.deleteMany({ where: { doctorId } });
}
