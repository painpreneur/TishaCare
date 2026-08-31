import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/bot";

// Telegram sends this header back on every webhook call when a secret_token
// was set on registration (see scripts/webhook.mjs) — without checking it,
// anyone who finds this URL could inject fake updates.
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json();
  await bot.handleUpdate(update);
  return NextResponse.json({ ok: true });
}
