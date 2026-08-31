import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctor } from "@/lib/session";
import { isClinicAdmin } from "@/lib/doctorRole";
import { licenseGate } from "@/lib/license";
import { createClinicInvite } from "@/lib/clinicInvite";

export async function POST(req: NextRequest) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  if (!isClinicAdmin(doctor)) {
    return NextResponse.json({ error: "Доступно только администратору клиники" }, { status: 403 });
  }
  const gate = licenseGate(doctor);
  if (gate) return gate;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : null;

  const invite = await createClinicInvite(doctor.clinicId as string, doctor.id, email);
  return NextResponse.json({ token: invite.token, id: invite.id });
}
