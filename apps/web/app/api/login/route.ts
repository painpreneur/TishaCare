import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@tishacare/db";
import { createSession } from "@/lib/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/sessionCookie";
import { clientIp, loginAttemptThrottled } from "@/lib/loginThrottle";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (loginAttemptThrottled(clientIp(req))) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Подождите минуту и попробуйте снова." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { email, password } = await req.json();
  const doctor = await prisma.doctor.findUnique({ where: { email } });

  const invalidCredentials = () =>
    NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

  if (!doctor) return invalidCredentials();

  if (doctor.lockedUntil && doctor.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((doctor.lockedUntil.getTime() - Date.now()) / 60_000);
    return NextResponse.json(
      { error: `Аккаунт временно заблокирован из-за неудачных попыток входа. Повторите через ${minutes} мин.` },
      { status: 429 }
    );
  }

  if (!(await bcrypt.compare(password, doctor.passwordHash))) {
    const attempts = doctor.failedLoginAttempts + 1;
    await prisma.doctor.update({
      where: { id: doctor.id },
      data:
        attempts >= MAX_FAILED_ATTEMPTS
          ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) }
          : { failedLoginAttempts: attempts },
    });
    return invalidCredentials();
  }

  if (doctor.failedLoginAttempts !== 0 || doctor.lockedUntil) {
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const { token, expiresAt } = await createSession(doctor.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
  return res;
}
