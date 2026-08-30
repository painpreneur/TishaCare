import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, Client } from "pg";

// Uses the pg-driver adapter instead of Prisma's built-in Rust engine
// connector: the Rust connector's TLS handshake hangs/closes against Neon's
// endpoint in this environment, while the plain `pg` driver connects fine.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Errors that mean the connection died mid-flight.
const RETRYABLE_ERROR = /Connection terminated|Server has closed the connection|ECONNRESET|timeout/i;

// Read-only Prisma operations. Retrying one of these can only ever repeat
// work, never change state, so it is safe against a lost response. Writes are
// deliberately excluded: a `create` whose INSERT committed server-side before
// the response was lost would be silently duplicated on retry, and tables like
// CheckIn / QuestionnaireResponse / Thought / Medication have no natural unique
// key to bounce the second insert off. A lost write now surfaces as an error
// the caller can retry deliberately.
const RETRYABLE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    // The upstream Postgres endpoint occasionally hangs a connection or a
    // query indefinitely with no error at all — confirmed root cause: the
    // server executes the write and is waiting for the client's COMMIT, but
    // the response that would let our client know the write succeeded gets
    // lost in transit, so the client never sends that COMMIT either. That
    // leaves the session "idle in transaction" holding a row lock forever,
    // wedging every subsequent request for the same row. statement_timeout
    // doesn't help here (the query itself isn't slow) — the setting that
    // actually recovers this is idle_in_transaction_session_timeout, which
    // makes Postgres itself kill an abandoned transaction and free the lock.
    connectionTimeoutMillis: 8000,
    statement_timeout: 8000,
    query_timeout: 8000,
  });
  // pg.Pool emits 'error' when an IDLE pooled connection drops in the
  // background (not during a query) — with no listener, Node's EventEmitter
  // throws and crashes the whole process. The pool discards the dead
  // connection and opens a fresh one on the next checkout regardless.
  pool.on("error", (err) => {
    console.error("Postgres pool idle connection error (recovered):", err.message);
  });
  const adapter = new PrismaPg(pool);

  startIdleTransactionJanitor(url, isLocal);

  // Workaround for a flaky upstream Postgres endpoint that occasionally drops
  // a response in transit (the query succeeds server-side, but we never hear
  // back). Retry up to twice more — but only for read operations, since the
  // pool hands out a fresh connection on the next checkout and a repeated read
  // is harmless, whereas a repeated write is not.
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        if (!RETRYABLE_OPERATIONS.has(operation)) {
          return query(args);
        }
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          try {
            return await query(args);
          } catch (e) {
            lastError = e;
            if (!(e instanceof Error && RETRYABLE_ERROR.test(e.message))) throw e;
          }
        }
        throw lastError;
      },
    },
  }) as unknown as PrismaClient;
}

// The upstream Postgres endpoint occasionally loses a response in transit,
// leaving that session "idle in transaction" holding a row lock forever —
// this wedges every future request touching the same row. Startup-packet
// timeout parameters (Pool config options) don't reliably reach the actual
// backend through Neon's pooler, and setting them via an explicit query
// right after connect races Prisma's own first query on that same client.
// A separate janitor connection sidesteps both problems: it periodically
// finds and terminates any session that's been idle-in-transaction too long.
let janitorStarted = false;
function startIdleTransactionJanitor(connectionString: string, isLocal: boolean) {
  if (janitorStarted || isLocal) return;
  janitorStarted = true;
  const sweep = async () => {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(
        `select pg_terminate_backend(pid) from pg_stat_activity
         where state = 'idle in transaction' and pid <> pg_backend_pid()
           and now() - xact_start > interval '10 seconds'`
      );
    } catch {
      // best-effort; try again on the next tick
    } finally {
      await client.end().catch(() => {});
    }
  };
  setInterval(sweep, 30000);
  sweep();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export * from "./clinical";
export * from "./questionnaires";
export * from "./lifeBalance";
export * from "./checkin";
export * from "./medReference";
export * from "./invite";
export * from "./cognitive";
export * from "./events";
export * from "./env";
