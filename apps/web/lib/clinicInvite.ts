import { prisma, generateClinicInviteToken } from "@tishacare/db";

// A clinic admin creates a one-time link; a colleague registers through it and
// lands in the clinic as a "member". Tokens live in the URL, so they are long
// and opaque rather than short codes.

export const CLINIC_INVITE_TTL_DAYS = 14;

export class ClinicInviteError extends Error {
  constructor(message: string, readonly httpStatus = 400) {
    super(message);
  }
}

function ttlEnd(): Date {
  return new Date(Date.now() + CLINIC_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createClinicInvite(clinicId: string, createdById: string, email?: string | null) {
  return prisma.clinicInvite.create({
    data: {
      clinicId,
      createdById,
      email: email?.trim().toLowerCase() || null,
      token: generateClinicInviteToken(),
      expiresAt: ttlEnd(),
    },
  });
}

/** Resolve a token to its clinic, or throw a typed error. Does not consume it. */
export async function resolveClinicInvite(token: string) {
  const invite = token
    ? await prisma.clinicInvite.findUnique({ where: { token }, include: { clinic: true } })
    : null;
  if (!invite) throw new ClinicInviteError("Приглашение не найдено", 404);
  if (invite.usedAt) throw new ClinicInviteError("Это приглашение уже использовано", 410);
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new ClinicInviteError("Срок действия приглашения истёк", 410);
  }
  return invite;
}

/** Pending (unused, unexpired) invites first, then recently used ones. */
export async function listClinicInvites(clinicId: string) {
  return prisma.clinicInvite.findMany({
    where: { clinicId },
    orderBy: [{ usedAt: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
}

export async function revokeClinicInvite(id: string, clinicId: string) {
  const invite = await prisma.clinicInvite.findUnique({ where: { id } });
  if (!invite || invite.clinicId !== clinicId) {
    throw new ClinicInviteError("Приглашение не найдено", 404);
  }
  if (invite.usedAt) throw new ClinicInviteError("Использованное приглашение не отозвать", 409);
  await prisma.clinicInvite.delete({ where: { id } });
}
