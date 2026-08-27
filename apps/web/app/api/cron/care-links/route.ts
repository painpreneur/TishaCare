import { NextRequest, NextResponse } from "next/server";
import { finalizeEndedLinks } from "@/lib/careLink";

// Flips CareLinks whose cooling-off window (`endsAt`) has passed from "ending"
// to "ended". Vercel invokes cron jobs with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ended = await finalizeEndedLinks();
  return NextResponse.json({ ok: true, ended });
}
