import { NextRequest, NextResponse } from "next/server";
import { ClinicInviteError, resolveClinicInvite } from "@/lib/clinicInvite";

// Public: the registration page calls this to show which clinic an invite link
// belongs to before the colleague fills the form. Does not consume the invite.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  try {
    const invite = await resolveClinicInvite(token);
    return NextResponse.json({ clinicName: invite.clinic.name });
  } catch (e) {
    if (e instanceof ClinicInviteError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
