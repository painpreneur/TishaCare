import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/sessionCookie";

export async function POST(req: NextRequest) {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
