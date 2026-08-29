import { miniAppAuthHeaders } from "@/lib/miniappClient";

// Shape of GET /api/miniapp/dam — the home-screen summary: dam stage + status,
// today's state, the milestone timeline, and a plain activity summary (last
// entry, 30-day count, completed questionnaires).

export type TodayState = "added" | "done" | "pending";

export interface DamHomeData {
  stage: number;
  stageTitle: string;
  statusLine: string;
  todayState: TodayState;
  welcomeBackLine: string | null;
  /** Total qualifying days ever. 0 = no dam yet, DamScene renders nothing. */
  entryCount: number;
  entriesLast30: number;
  lastEntryAt: number | null;
  milestones: { stage: number; reachedAt: string }[];
  questionnaires: { code: string; title: string; count: number; lastAt: string }[];
}

export async function fetchDamHome(): Promise<DamHomeData | null> {
  try {
    const res = await fetch("/api/miniapp/dam", { headers: miniAppAuthHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as DamHomeData;
  } catch {
    return null;
  }
}
