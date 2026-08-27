import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@tishacare/db";
import { createSession } from "@/lib/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/sessionCookie";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const doctor = await prisma.doctor.findUnique({ where: { email } });
  if (!doctor || !(await bcrypt.compare(password, doctor.passwordHash))) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(doctor.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
  return res;
}
