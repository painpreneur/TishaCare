"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { STAGES } from "@/lib/gamification";
import { fetchDamHome, type DamHomeData } from "@/lib/damClient";

// One-time card when the patient crosses a "Плотина Тиши" stage. "Seen" is kept
// in localStorage (a list of stage numbers), like the intro flag — no new
// column. A single muted confetti burst fires only for a fresh crossing, never
// on an ordinary check-in, and never when the viewer prefers reduced motion.

const SEEN_KEY = "tc_milestone_seen";
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
// app palette: indigo accent, one soft green, warm browns — not rainbow
const CONFETTI_COLORS = ["#4f6bfe", "#6fbf8f", "#9b6b43", "#c8a06b"];

function readSeen(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function writeSeen(stages: number[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set(stages)].sort((a, b) => a - b)));
  } catch {
    // ignore unavailable storage
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

async function burst() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      colors: CONFETTI_COLORS,
      particleCount: 90,
      spread: 70,
      startVelocity: 32,
      gravity: 0.9,
      scalar: 0.9,
      ticks: 160,
      origin: { y: 0.35 },
      disableForReducedMotion: true,
    });
  } catch {
    // confetti is optional sugar; the card carries the meaning
  }
}

export default function MilestoneCard({ data: dataProp }: { data?: DamHomeData | null }) {
  const selfFetch = dataProp === undefined;
  const [fetched, setFetched] = useState<DamHomeData | null>(null);
  const [stage, setStage] = useState<number | null>(null);

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
    if (!data || stage != null) return;
    const all = data.milestones;
    if (all.length === 0) return;
    const seen = readSeen();
    const unseen = all.filter((m) => !seen.includes(m.stage));
    if (unseen.length === 0) return;

    // Show the latest crossed stage; mark every milestone seen so a skipped
    // lower one does not pop later.
    const latest = unseen.reduce((a, b) => (b.stage > a.stage ? b : a));
    writeSeen(all.map((m) => m.stage));
    setStage(latest.stage);

    if (
      Date.now() - new Date(latest.reachedAt).getTime() < FRESH_MS &&
      !prefersReducedMotion()
    ) {
      void burst();
    }
  }, [data, stage]);

  // stage < 1 is the "dismissed" sentinel set by the close button.
  if (stage == null || stage < 1) return null;
  const info = STAGES[Math.min(stage, STAGES.length) - 1];

  return (
    <div className="milestone-card">
      <button
        type="button"
        className="milestone-close"
        onClick={() => setStage(-1)}
        aria-label="Закрыть"
      >
        ×
      </button>
      <Image src={`/gamification/stage-${stage}.png`} width={200} height={200} alt={info.title} priority />
      <h2>{info.title}</h2>
      <p>{info.milestoneCopy}</p>
    </div>
  );
}
