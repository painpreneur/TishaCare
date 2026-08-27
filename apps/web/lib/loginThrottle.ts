// Best-effort per-IP throttle for /api/login. This is in-memory, so on a
// serverless host it only covers requests that land on the same warm instance
// — it slows a burst from one source but is not a distributed guarantee. The
// durable protection is the per-account lockout in the login route (Doctor
// .failedLoginAttempts / .lockedUntil). It exists to blunt high-rate spraying
// across many non-existent emails, which never trips the per-account lock.

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

const hits = new Map<string, number[]>();

/** Records an attempt for `ip` and returns true if it is now over the limit. */
export function loginAttemptThrottled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_ATTEMPTS;
}

export function clientIp(req: { headers: Headers; ip?: string }): string {
  return (
    req.ip ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
