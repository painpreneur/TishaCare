import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@tishacare/db";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const doctor = await prisma.doctor.findUnique({ where: { email } });
  if (!doctor || !(await bcrypt.compare(password, doctor.passwordHash))) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, doctor.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
