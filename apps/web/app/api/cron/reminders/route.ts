import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { bot } from "@/lib/bot";
import { openMiniAppKeyboard } from "@/lib/botMenu";

// Vercel invokes cron jobs with `Authorization: Bearer $CRON_SECRET` — see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patients = await prisma.patient.findMany({
    where: { telegramId: { not: null } },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let sent = 0;
  for (const patient of patients) {
    if (!patient.telegramId) continue;

    const checkedInToday = await prisma.checkIn.findFirst({
      where: { patientId: patient.id, date: { gte: startOfDay } },
    });
    if (checkedInToday) continue;

    const keyboard = openMiniAppKeyboard("/miniapp/checkin");
    const text = "Привет! Не забудьте отметить своё состояние сегодня 🙂";
    await bot.telegram.sendMessage(patient.telegramId, text, keyboard).catch(() => {});
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
