import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, prisma, generateInviteCode } from "@tishacare/db";
import { createPatientSession } from "@/lib/patientSession";
import { PATIENT_SESSION_COOKIE, patientSessionCookieOptions } from "@/lib/patientSessionCookie";
import { clientIp, loginAttemptThrottled } from "@/lib/loginThrottle";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes("email") : String(target ?? "").includes("email");
}

export async function POST(req: NextRequest) {
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

  const passwordHash = await bcrypt.hash(password, 10);

  let patientId: string;
  try {
    const patient = await prisma.patient.create({
      data: { name, email, passwordHash, inviteCode: generateInviteCode() },
    });
    patientId = patient.id;
  } catch (e) {
    if (isEmailUniqueViolation(e)) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
    }
    throw e;
  }

  const { token, expiresAt } = await createPatientSession(patientId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PATIENT_SESSION_COOKIE, token, { ...patientSessionCookieOptions, expires: expiresAt });
  return res;
}
