import { NextResponse } from "next/server";
import { prisma, APP_ENV } from "@tishacare/db";

// Unauthenticated liveness probe for an external uptime monitor. Reports
// whether the process can reach the database — the common failure mode here
// is "app up, Postgres endpoint wedged" (see packages/db/index.ts). Keep it
// cheap and un-retried so it fails fast and honestly.
export const dynamic = "force-dynamic";

const DB_CHECK_TIMEOUT_MS = 5000;

export async function GET() {
  const startedAt = Date.now();
  let db: "ok" | "down" = "down";

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db check timed out")), DB_CHECK_TIMEOUT_MS)
      ),
    ]);
    db = "ok";
  } catch (err) {
    console.error("[health] db check failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json(
    {
      status: db === "ok" ? "ok" : "error",
      db,
      env: APP_ENV,
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    },
    { status: db === "ok" ? 200 : 503 }
  );
}
