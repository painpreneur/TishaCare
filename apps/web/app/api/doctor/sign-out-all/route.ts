import { NextResponse } from "next/server";
import { getCurrentDoctor, destroyAllSessionsForDoctor } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/sessionCookie";

// Revokes every session for the current doctor (this device included).
export async function POST() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  await destroyAllSessionsForDoctor(doctor.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
