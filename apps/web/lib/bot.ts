import type { Telegraf } from "telegraf";
import { createBot } from "@tishacare/bot-core";

// Next.js dev-mode hot reload re-evaluates this module on every edit; without
// caching on globalThis each reload would register a second copy of every
// handler on the same long-lived process, so /start would reply twice, three
// times, etc.
const globalForBot = globalThis as unknown as { bot?: Telegraf };

export const bot = globalForBot.bot ?? createBot();

if (process.env.NODE_ENV !== "production") {
  globalForBot.bot = bot;
}
