import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/bot";
import {
  sendDueCheckinReminders,
  sendDueMedReminders,
  sendDueEncounterReminders,
  sendDueReengagement,
} from "@tishacare/bot-core";

// Vercel invokes cron jobs with `Authorization: Bearer $CRON_SECRET` — see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
// Runs once a day (Hobby limit): every bot nudge rides the same slot.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [checkins, medReminders, encounters, reengagement] = await Promise.all([
    sendDueCheckinReminders(bot.telegram),
    sendDueMedReminders(bot.telegram),
    sendDueEncounterReminders(bot.telegram),
    sendDueReengagement(bot.telegram),
  ]);
  return NextResponse.json({ ok: true, checkins, medReminders, encounters, reengagement });
}
