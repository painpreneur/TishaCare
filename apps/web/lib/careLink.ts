import { prisma } from "@tishacare/db";

// CareLink lifecycle. Either side requests a connection, the other confirms.
// The patient can Pause (instant, reversible — stops new data reaching the
// doctor) or End (a cooling-off window: status "ending" until `endsAt`, still
// reversible, then "ended"). `managedByClinic` links can't be ended by the
// patient unilaterally.
//
//   pending ──accept──▶ active ──pause──▶ paused ──resume──▶ active
//      │                  │  ▲                │
//   decline           begin-end          begin-end
//      ▼                  ▼  │ cancel-end     ▼
//   declined           ending ─────────────▶ ending
//                         │ (endsAt reached, cron)
//                         ▼
//                       ended

export const CARE_LINK_COOLDOWN_DAYS = 7;

/** Statuses in which the doctor still sees the patient's data. */
export const SHARING_STATUSES = ["active", "ending"] as const;

export class CareLinkError extends Error {
  constructor(message: string, readonly httpStatus = 400) {
    super(message);
  }
}

function cooldownEnd(): Date {
  return new Date(Date.now() + CARE_LINK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

/** The care links a doctor currently sees data through. */
export function activeLinksForDoctor(doctorId: string) {
  return prisma.careLink.findMany({
    where: { doctorId, status: { in: [...SHARING_STATUSES] } },
  });
}

/** Patient ids a doctor currently has access to. */
export async function accessiblePatientIds(doctorId: string): Promise<string[]> {
  const links = await activeLinksForDoctor(doctorId);
  return links.map((l) => l.patientId);
}

/** True if this doctor may see this patient right now. */
export async function doctorCanAccessPatient(doctorId: string, patientId: string): Promise<boolean> {
  const link = await prisma.careLink.findUnique({
    where: { patientId_doctorId: { patientId, doctorId } },
  });
  return !!link && (SHARING_STATUSES as readonly string[]).includes(link.status);
}

// ── Patient-initiated actions ────────────────────────────────────────────────

/** Patient requests a connection to the doctor with `connectCode`. */
export async function requestLink(patientId: string, connectCode: string) {
  const code = connectCode.trim().toUpperCase();
  const doctor = code ? await prisma.doctor.findUnique({ where: { connectCode: code } }) : null;
  if (!doctor) throw new CareLinkError("Врач с таким кодом не найден", 404);

  const existing = await prisma.careLink.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: doctor.id } },
  });

  if (existing && !["ended", "declined"].includes(existing.status)) {
    throw new CareLinkError(
      existing.status === "pending" ? "Запрос этому врачу уже отправлен" : "Вы уже связаны с этим врачом",
      409
    );
  }

  const data = {
    status: "pending",
    requestedBy: "patient",
    activatedAt: null,
    endsAt: null,
    endedAt: null,
  };
  return existing
    ? prisma.careLink.update({ where: { id: existing.id }, data })
    : prisma.careLink.create({ data: { ...data, patientId, doctorId: doctor.id } });
}

async function patientLink(patientId: string, linkId: string) {
  const link = await prisma.careLink.findUnique({ where: { id: linkId } });
  if (!link || link.patientId !== patientId) throw new CareLinkError("Связь не найдена", 404);
  return link;
}

export async function pauseLink(patientId: string, linkId: string) {
  const link = await patientLink(patientId, linkId);
  if (link.status !== "active") throw new CareLinkError("Приостановить можно только активную связь");
  return prisma.careLink.update({ where: { id: link.id }, data: { status: "paused" } });
}

export async function resumeLink(patientId: string, linkId: string) {
  const link = await patientLink(patientId, linkId);
  if (link.status !== "paused") throw new CareLinkError("Возобновить можно только приостановленную связь");
  return prisma.careLink.update({ where: { id: link.id }, data: { status: "active" } });
}

export async function beginEnd(patientId: string, linkId: string) {
  const link = await patientLink(patientId, linkId);
  if (link.managedByClinic) {
    throw new CareLinkError("Эта связь ведётся клиникой — завершить её может только клиника", 403);
  }
  if (!["active", "paused"].includes(link.status)) {
    throw new CareLinkError("Эту связь нельзя завершить");
  }
  return prisma.careLink.update({
    where: { id: link.id },
    data: { status: "ending", endsAt: cooldownEnd() },
  });
}

export async function cancelEnd(patientId: string, linkId: string) {
  const link = await patientLink(patientId, linkId);
  if (link.status !== "ending") throw new CareLinkError("Эта связь не в процессе завершения");
  return prisma.careLink.update({
    where: { id: link.id },
    data: { status: "active", endsAt: null },
  });
}

// ── Doctor-initiated actions ─────────────────────────────────────────────────

async function doctorLink(doctorId: string, linkId: string) {
  const link = await prisma.careLink.findUnique({ where: { id: linkId } });
  if (!link || link.doctorId !== doctorId) throw new CareLinkError("Связь не найдена", 404);
  return link;
}

export async function acceptLink(doctorId: string, linkId: string) {
  const link = await doctorLink(doctorId, linkId);
  if (link.status !== "pending") throw new CareLinkError("Этот запрос уже обработан");
  return prisma.careLink.update({
    where: { id: link.id },
    data: { status: "active", activatedAt: new Date() },
  });
}

export async function declineLink(doctorId: string, linkId: string) {
  const link = await doctorLink(doctorId, linkId);
  if (link.status !== "pending") throw new CareLinkError("Этот запрос уже обработан");
  return prisma.careLink.update({ where: { id: link.id }, data: { status: "declined" } });
}

/** Doctor ends a link (offboarding) — takes effect immediately. */
export async function endLinkByDoctor(doctorId: string, linkId: string) {
  const link = await doctorLink(doctorId, linkId);
  if (["ended", "declined"].includes(link.status)) throw new CareLinkError("Связь уже завершена");
  return prisma.careLink.update({
    where: { id: link.id },
    data: { status: "ended", endedAt: new Date(), endsAt: null },
  });
}

// ── Cron ────────────────────────────────────────────────────────────────────

/** Flip links whose cooling-off window has passed to "ended". */
export async function finalizeEndedLinks(): Promise<number> {
  const { count } = await prisma.careLink.updateMany({
    where: { status: "ending", endsAt: { lte: new Date() } },
    data: { status: "ended", endedAt: new Date(), endsAt: null },
  });
  return count;
}
