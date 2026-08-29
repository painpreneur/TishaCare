"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UNLOCKS } from "@/lib/unlocks";
import { fetchDamHome, type DamHomeData } from "@/lib/damClient";

// One-time "Тиша заметил…" card when the patient earns an unlock that has a
// card (cosmetic unlocks do not interrupt). "Seen" is a list of codes in
// localStorage, like the milestone flag — no new column. No confetti: confetti
// is reserved for the dam milestones.

const SEEN_KEY = "tc_unlock_seen";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(codes: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set(codes)]));
  } catch {
    // ignore unavailable storage
  }
}

export default function UnlockCard({ data: dataProp }: { data?: DamHomeData | null }) {
  const selfFetch = dataProp === undefined;
  const [fetched, setFetched] = useState<DamHomeData | null>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!selfFetch) return;
    let active = true;
    fetchDamHome().then((d) => active && setFetched(d));
    return () => {
      active = false;
    };
  }, [selfFetch]);

  const data = selfFetch ? fetched : dataProp;

  useEffect(() => {
    if (!data || code != null) return;
    const earned = data.unlocks;
    if (earned.length === 0) return;
    const seen = readSeen();
    // show the first unseen unlock (in UNLOCKS order) that pops a card
    const next = UNLOCKS.find((u) => u.card && earned.includes(u.code) && !seen.includes(u.code));
    // mark every earned code seen so nothing pops later
    writeSeen([...seen, ...earned]);
    if (next) setCode(next.code);
  }, [data, code]);

  if (code == null) return null;
  const info = UNLOCKS.find((u) => u.code === code);
  if (!info) return null;

  return (
    <div className="unlock-card">
      <button
        type="button"
        className="milestone-close"
        onClick={() => setCode("")}
        aria-label="Закрыть"
      >
        ×
      </button>
      <Image src={`/gamification/unlock-${info.code}.png`} width={72} height={72} alt="" priority />
      <p className="unlock-card-kicker">Тиша заметил</p>
      <h2>{info.title}</h2>
      <p>{info.copy}</p>
    </div>
  );
}
