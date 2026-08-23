// Split out from lib/session.ts so middleware.ts (Edge runtime) can read the
// cookie name without pulling in @mindsteady/db (whose Prisma client now
// imports the `pg` driver, which uses Node builtins unsupported on Edge).
export const SESSION_COOKIE = "doctorId";
