import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/bot";
import { sendDueCheckinReminders } from "@tishacare/bot-core";

// Vercel invokes cron jobs with `Authorization: Bearer $CRON_SECRET` — see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await sendDueCheckinReminders(bot.telegram);
  return NextResponse.json({ ok: true, sent });
}
