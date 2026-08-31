// Register / inspect / remove the Telegram webhook for one contour.
//
// The webhook points Telegram at apps/web's /api/bot/webhook route. It is set
// per contour (production, staging) from that contour's env — there is no
// shared registration, because Telegram delivers each update to exactly one
// URL per bot token, and each contour has its own bot token.
//
// Usage (run with the target contour's env loaded — Vercel env pull, or the
// contour's .env):
//   node scripts/webhook.mjs info          getWebhookInfo, pretty-printed
//   node scripts/webhook.mjs set           point Telegram at WEBAPP_URL
//   node scripts/webhook.mjs set --drop    ...and drop the pending backlog
//   node scripts/webhook.mjs delete --force   unregister (bot goes silent)
//   node scripts/webhook.mjs <cmd> --dry-run  print the call, send nothing
//
// Reads: TELEGRAM_BOT_TOKEN (required), WEBAPP_URL + TELEGRAM_WEBHOOK_SECRET
// (required for `set`). APP_ENV is only used to label the output.

const [cmd, ...flags] = process.argv.slice(2);
const has = (f) => flags.includes(f);
const dryRun = has("--dry-run");

const token = process.env.TELEGRAM_BOT_TOKEN;
const webappUrl = process.env.WEBAPP_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appEnv = process.env.APP_ENV ?? process.env.VERCEL_ENV ?? "(unset)";

function die(msg) {
  console.error(`webhook: ${msg}`);
  process.exit(1);
}

if (!token) die("TELEGRAM_BOT_TOKEN is not set — load this contour's env first.");
if (!["info", "set", "delete"].includes(cmd)) {
  die("usage: node scripts/webhook.mjs <info|set|delete> [--drop|--force|--dry-run]");
}

// A bot token is "<digits>:<rest>"; only ever print the leading id.
const tokenLabel = `${token.split(":")[0]}:…`;

async function call(method, body) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  if (dryRun) {
    console.log(`[dry-run] POST ${method}`);
    if (body) console.log(JSON.stringify(body, null, 2));
    return null;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) die(`${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

console.log(`contour APP_ENV=${appEnv}  bot ${tokenLabel}`);

if (cmd === "info") {
  const r = await call("getWebhookInfo");
  if (r) {
    console.log(`  url:              ${r.url || "(none)"}`);
    console.log(`  pending updates:  ${r.pending_update_count}`);
    console.log(`  custom cert:      ${r.has_custom_certificate}`);
    if (r.ip_address) console.log(`  ip:               ${r.ip_address}`);
    if (r.last_error_date) {
      const when = new Date(r.last_error_date * 1000).toISOString();
      console.log(`  last error:       ${when} — ${r.last_error_message}`);
    }
    if (r.max_connections) console.log(`  max connections:  ${r.max_connections}`);
  }
  process.exit(0);
}

if (cmd === "set") {
  if (!webappUrl) die("WEBAPP_URL is not set — needed to build the webhook URL.");
  if (!secret) die("TELEGRAM_WEBHOOK_SECRET is not set — the route rejects calls without it.");
  const hookUrl = `${webappUrl.replace(/\/+$/, "")}/api/bot/webhook`;
  const body = {
    url: hookUrl,
    secret_token: secret,
    // The update types bot-core actually handles (commands / text, button
    // taps). Keeps Telegram from queuing the rest. Extend if handlers grow.
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: has("--drop"),
  };
  await call("setWebhook", body);
  console.log(dryRun ? "" : `  set → ${hookUrl}${has("--drop") ? " (dropped backlog)" : ""}`);
  process.exit(0);
}

if (cmd === "delete") {
  if (!has("--force")) {
    die("delete unregisters the webhook and the bot stops receiving updates. Re-run with --force.");
  }
  await call("deleteWebhook", { drop_pending_updates: has("--drop") });
  console.log(dryRun ? "" : "  deleted — this contour's bot is now silent until `set` is run again.");
  process.exit(0);
}
