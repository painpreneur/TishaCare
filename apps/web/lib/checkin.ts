// The check-in vocabulary now lives in @tishacare/db so the Telegram bot
// (@tishacare/bot-core) can share it. This re-export keeps the many
// `@/lib/checkin` imports across the web app working unchanged.
export * from "@tishacare/db/client";
