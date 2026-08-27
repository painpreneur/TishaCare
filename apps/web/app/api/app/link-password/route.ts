import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@tishacare/db";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";

// Lets an already-authenticated patient (typically a Telegram-only account)
// attach an email + password so they can also sign in on the web portal.
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` },
      { status: 400 }
    );
  }

  try {
    await prisma.patient.update({
      where: { id: auth.patientId },
      data: { email, passwordHash: await bcrypt.hash(password, 10) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Этот email уже занят" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
