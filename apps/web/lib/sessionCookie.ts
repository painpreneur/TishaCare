// Split out from lib/session.ts so middleware.ts (Edge runtime) can read the
// cookie name without pulling in @tishacare/db (whose Prisma client imports the
// `pg` driver, which uses Node builtins unsupported on Edge).
export const SESSION_COOKIE = "tc_session";

// Shared cookie attributes for login (set) and logout (delete). No imports so
// this stays Edge-safe. `secure` only in production so local http still works.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};
