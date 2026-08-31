import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, prisma, generateConnectCode } from "@tishacare/db";
import { createSession } from "@/lib/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/sessionCookie";
import { clientIp, loginAttemptThrottled } from "@/lib/loginThrottle";
import { isPracticeType } from "@/lib/practiceType";
import { ClinicInviteError, resolveClinicInvite } from "@/lib/clinicInvite";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // Reuses the /api/login per-IP bucket: registration is another unauthenticated
  // write worth rate-limiting from the same source.
  if (loginAttemptThrottled(clientIp(req))) {
    return NextResponse.json(
      { error: "Слишком много попыток. Подождите минуту и попробуйте снова." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const practiceType = body.practiceType;
  const clinicName = String(body.clinicName ?? "").trim();
  const clinicInviteToken = String(body.clinicInviteToken ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Введите имя" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` },
      { status: 400 }
    );
  }
  // An invite link overrides the practice-type choice: the colleague joins the
  // inviting clinic as a member, whatever the form said.
  if (!clinicInviteToken) {
    if (!isPracticeType(practiceType)) {
      return NextResponse.json({ error: "Выберите тип практики" }, { status: 400 });
    }
    if (practiceType === "clinic" && !clinicName) {
      return NextResponse.json({ error: "Введите название клиники" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connectCode = generateConnectCode();

  let doctorId: string;
  try {
    if (clinicInviteToken) {
      const invite = await resolveClinicInvite(clinicInviteToken);
      const doctor = await prisma.$transaction(async (tx) => {
        // Consume the invite first, conditionally — a second concurrent
        // registration with the same token finds nothing to update and aborts.
        const claimed = await tx.clinicInvite.updateMany({
          where: { id: invite.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count === 0) {
          throw new ClinicInviteError("Это приглашение уже использовано", 410);
        }
        const created = await tx.doctor.create({
          data: {
            clinicId: invite.clinicId,
            practiceType: "clinic",
            role: "member",
            email,
            passwordHash,
            name,
            connectCode,
          },
        });
        await tx.clinicInvite.update({
          where: { id: invite.id },
          data: { usedById: created.id },
        });
        return created;
      });
      doctorId = doctor.id;
    } else if (practiceType === "clinic") {
      // The doctor who creates a clinic is its admin (invites colleagues later).
      const doctor = await prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.create({ data: { name: clinicName } });
        return tx.doctor.create({
          data: { clinicId: clinic.id, practiceType, role: "admin", email, passwordHash, name, connectCode },
        });
      });
      doctorId = doctor.id;
    } else {
      const doctor = await prisma.doctor.create({
        data: { practiceType, email, passwordHash, name, connectCode },
      });
      doctorId = doctor.id;
    }
  } catch (e) {
    if (e instanceof ClinicInviteError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
    }
    throw e;
  }

  const { token, expiresAt } = await createSession(doctorId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
  return res;
}
