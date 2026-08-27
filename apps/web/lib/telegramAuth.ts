import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@tishacare/db";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

/**
 * Validates Telegram Mini App initData per Telegram's documented algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");
  if (hashBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(hashBuffer, computedBuffer)) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS) {
    return null;
  }

  const userJson = params.get("user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

export interface MiniAppAuth {
  patientId: string;
  patientName: string;
  telegramId: string;
}

/**
 * Resolves the current request to a Patient via Telegram initData.
 * If `MINIAPP_DEV_BYPASS=1` is explicitly set, falls back to the
 * `X-Dev-Telegram-Id` header with no signature check — this is what makes
 * the Mini App testable from a plain browser without a real Telegram
 * session. This is a deliberate opt-in env var (not tied to NODE_ENV,
 * which can be "production" in staging/preview deployments too) — it must
 * be left unset for any deployment reachable by real patients.
 */
export async function resolveMiniAppPatient(req: NextRequest): Promise<MiniAppAuth | null> {
  let telegramId: string | null = null;

  const initData = req.headers.get("x-telegram-init-data");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (initData && botToken) {
    const user = verifyTelegramInitData(initData, botToken);
    if (user) telegramId = String(user.id);
  }

  if (!telegramId && process.env.MINIAPP_DEV_BYPASS === "1") {
    const devId = req.headers.get("x-dev-telegram-id");
    if (devId) telegramId = devId;
  }

  if (!telegramId) return null;

  const patient = await prisma.patient.findUnique({ where: { telegramId } });
  if (!patient) return null;

  return { patientId: patient.id, patientName: patient.name, telegramId };
}
