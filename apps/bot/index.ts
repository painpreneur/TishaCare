import "dotenv/config";
import cron from "node-cron";
import { APP_ENV } from "@tishacare/db";
import {
  createBot,
  sendDueCheckinReminders,
  sendDueMedReminders,
  sendDueEncounterReminders,
} from "@tishacare/bot-core";

// apps/bot is the local dev loop only (long-polling). Production traffic is
// served by the webhook in apps/web — see docs/ENVIRONMENTS.md. Starting a
// poller with the prod contour's token would call deleteWebhook and silently
// steal real patient updates onto this machine, so refuse outright.
if (APP_ENV === "production") {
  throw new Error(
    "apps/bot is the local dev bot and must not run with APP_ENV=production. " +
      "Production is served by apps/web's webhook."
  );
}

// Safety net: the upstream Postgres endpoint occasionally drops a pooled
// connection in the background (outside any query), surfacing as an unhandled
// error/rejection rather than a catchable query error. A crashed bot process
// stops responding entirely, which is worse than logging and carrying on —
// Telegraf's own per-update error handling covers errors inside a handler.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (bot kept running):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (bot kept running):", err);
});

const bot = createBot();

// Reminders in prod/staging are owned by Vercel Cron (apps/web
// /api/cron/reminders). This local poller only schedules them when explicitly
// asked, so a dev machine can't double-nudge patients if it shares a DB.
if (process.env.ENABLE_LOCAL_REMINDERS === "1") {
  cron.schedule("0 20 * * *", () => {
    sendDueCheckinReminders(bot.telegram);
    sendDueMedReminders(bot.telegram);
    sendDueEncounterReminders(bot.telegram);
  });
  console.log("[reminders] local scheduler enabled (daily 20:00)");
} else {
  console.log("[reminders] local scheduler disabled (handled by Vercel Cron). Set ENABLE_LOCAL_REMINDERS=1 to enable.");
}

bot.launch().then(() => console.log("Bot started"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
