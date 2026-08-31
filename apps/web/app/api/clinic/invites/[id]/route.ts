import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctor } from "@/lib/session";
import { isClinicAdmin } from "@/lib/doctorRole";
import { ClinicInviteError, revokeClinicInvite } from "@/lib/clinicInvite";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  if (!isClinicAdmin(doctor)) {
    return NextResponse.json({ error: "Доступно только администратору клиники" }, { status: 403 });
  }

  try {
    await revokeClinicInvite(params.id, doctor.clinicId as string);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClinicInviteError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
