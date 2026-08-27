import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@tishacare/db";
import { createPatientSession } from "@/lib/patientSession";
import { PATIENT_SESSION_COOKIE, patientSessionCookieOptions } from "@/lib/patientSessionCookie";
import { clientIp, loginAttemptThrottled } from "@/lib/loginThrottle";

// Mirrors /api/login for doctors: per-IP throttle blunts spraying, per-account
// lockout is the durable guard.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (loginAttemptThrottled(clientIp(req))) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Подождите минуту и попробуйте снова." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const patient = email ? await prisma.patient.findUnique({ where: { email } }) : null;

  const invalidCredentials = () =>
    NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

  if (!patient || !patient.passwordHash) return invalidCredentials();

  if (patient.lockedUntil && patient.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((patient.lockedUntil.getTime() - Date.now()) / 60_000);
    return NextResponse.json(
      { error: `Аккаунт временно заблокирован из-за неудачных попыток входа. Повторите через ${minutes} мин.` },
      { status: 429 }
    );
  }

  if (!(await bcrypt.compare(password, patient.passwordHash))) {
    const attempts = patient.failedLoginAttempts + 1;
    await prisma.patient.update({
      where: { id: patient.id },
      data:
        attempts >= MAX_FAILED_ATTEMPTS
          ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) }
          : { failedLoginAttempts: attempts },
    });
    return invalidCredentials();
  }

  if (patient.failedLoginAttempts !== 0 || patient.lockedUntil) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const { token, expiresAt } = await createPatientSession(patient.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PATIENT_SESSION_COOKIE, token, { ...patientSessionCookieOptions, expires: expiresAt });
  return res;
}
