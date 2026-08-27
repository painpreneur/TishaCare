import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma, isProduction } from "@tishacare/db";
import { CONSENT_VERSION } from "./consent";

// Fail closed and loud: the dev bypass below skips Telegram's signature check
// entirely, so it must never be reachable on the production contour. Throwing
// at module load surfaces the misconfiguration in the deploy logs and takes
// the affected routes down rather than serving them unauthenticated.
if (isProduction && process.env.MINIAPP_DEV_BYPASS === "1") {
  throw new Error(
    "MINIAPP_DEV_BYPASS=1 is set with APP_ENV=production — refusing to start. " +
      "Unset it in the production environment; it belongs only on staging/local."
  );
}

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
  consentAt: Date | null;
  consentVersion: string | null;
}

/**
 * Resolves the current request to a Patient via Telegram initData.
 * If `MINIAPP_DEV_BYPASS=1` is set, falls back to the `X-Dev-Telegram-Id`
 * header with no signature check — this is what makes the Mini App testable
 * from a plain browser without a real Telegram session. It is honoured only
 * on the staging/local contours: on `APP_ENV=production` the module-load
 * guard above throws, and this branch also ignores the flag as a backstop.
 */
export async function resolveMiniAppPatient(req: NextRequest): Promise<MiniAppAuth | null> {
  let telegramId: string | null = null;

  const initData = req.headers.get("x-telegram-init-data");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (initData && botToken) {
    const user = verifyTelegramInitData(initData, botToken);
    if (user) telegramId = String(user.id);
  }

  if (!telegramId && !isProduction && process.env.MINIAPP_DEV_BYPASS === "1") {
    const devId = req.headers.get("x-dev-telegram-id");
    if (devId) telegramId = devId;
  }

  if (!telegramId) return null;

  const patient = await prisma.patient.findUnique({ where: { telegramId } });
  if (!patient) return null;

  return {
    patientId: patient.id,
    patientName: patient.name,
    telegramId,
    consentAt: patient.consentAt,
    consentVersion: patient.consentVersion,
  };
}

export function hasCurrentConsent(auth: Pick<MiniAppAuth, "consentAt" | "consentVersion">): boolean {
  return Boolean(auth.consentAt) && auth.consentVersion === CONSENT_VERSION;
}

/**
 * Like resolveMiniAppPatient, but also requires the patient to have accepted
 * the current consent version. Use this on every route that records or
 * processes patient data; onboarding routes (session, profile, consent) stay
 * on resolveMiniAppPatient so the patient can reach the consent step.
 */
export async function resolveConsentedPatient(req: NextRequest): Promise<MiniAppAuth | null> {
  const auth = await resolveMiniAppPatient(req);
  if (!auth || !hasCurrentConsent(auth)) return null;
  return auth;
}
