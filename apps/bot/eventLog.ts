import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "events.jsonl");

// Independent of the database on purpose: a `prisma db push --force-reset` or a
// re-seed wipes dev.db, but this file lives outside Prisma's reach and survives it.
export async function logStartEvent(data: { telegramId: string; username?: string; name?: string }) {
  await mkdir(LOG_DIR, { recursive: true });
  const line = JSON.stringify({ ...data, type: "start", at: new Date().toISOString() }) + "\n";
  await appendFile(LOG_FILE, line);
}
