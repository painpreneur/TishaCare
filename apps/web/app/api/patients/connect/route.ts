import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctor } from "@/lib/session";
import { CareLinkError, connectByInviteCode } from "@/lib/careLink";

export async function POST(req: NextRequest) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  }

  const { code } = await req.json();

  try {
    const { patientId } = await connectByInviteCode(doctor.id, String(code || ""));
    return NextResponse.json({ ok: true, patientId });
  } catch (e) {
    if (e instanceof CareLinkError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
