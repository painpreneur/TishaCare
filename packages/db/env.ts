// Which deployment contour this process runs in. Set APP_ENV explicitly per
// environment (Vercel env vars / local .env). Falls back to "local" so a
// developer machine is never silently treated as production.
//
//   production — Vercel Production, prod bot, prod Neon branch
//   staging    — Vercel Preview alias, staging bot, staging Neon branch
//   local      — a developer machine: local Postgres / personal Neon branch,
//                dev bot token. Must never reach the prod DB or prod bot.
export type AppEnv = "production" | "staging" | "local";

function resolveAppEnv(): AppEnv {
  const raw = process.env.APP_ENV?.toLowerCase();
  if (raw === "production" || raw === "staging" || raw === "local") return raw;

  // Vercel sets VERCEL_ENV on its own deploys even when APP_ENV was forgotten:
  // map its "production" to ours and its "preview" to staging, so a deploy is
  // never mistaken for local. Anything else (incl. plain `next dev`) is local.
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return "local";
}

export const APP_ENV: AppEnv = resolveAppEnv();

export const isProduction = APP_ENV === "production";
export const isStaging = APP_ENV === "staging";
export const isLocal = APP_ENV === "local";
