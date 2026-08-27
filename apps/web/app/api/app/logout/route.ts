import { NextRequest, NextResponse } from "next/server";
import { destroyPatientSession } from "@/lib/patientSession";
import { PATIENT_SESSION_COOKIE } from "@/lib/patientSessionCookie";

export async function POST(req: NextRequest) {
  await destroyPatientSession(req.cookies.get(PATIENT_SESSION_COOKIE)?.value);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PATIENT_SESSION_COOKIE);
  return res;
}
