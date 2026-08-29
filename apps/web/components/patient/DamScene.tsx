"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { STAGES } from "@/lib/gamification";
import { fetchDamHome, type DamHomeData, type TodayState } from "@/lib/damClient";

// "Плотина Тиши" scene. Rewards the act of regular recording, never the content.
// The beaver lives inside each stage illustration, so the "today" sprite is a
// small indicator beside the status line, not an overlay on the scene.
//
// On the home screen PatientHome fetches the snapshot once and passes it in; on
// /progress there is no such parent, so DamScene fetches for itself.

const SPRITE: Record<TodayState, { src: string; alt: string }> = {
  added: { src: "/gamification/tisha-today-active.png", alt: "Тиша кладёт веточку" },
  done: { src: "/gamification/tisha-today-content.png", alt: "Тиша отдыхает у воды" },
  pending: { src: "/gamification/tisha-today-pending.png", alt: "Тиша смотрит на воду" },
};

type Season = "spring" | "summer" | "autumn" | "winter";
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const SEASON_LABEL: Record<Season, string> = {
  spring: "весна",
  summer: "лето",
  autumn: "осень",
  winter: "зима",
};

function currentSeason(): Season {
  const m = new Date().getMonth();
  return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
}

function stageSrc(stage: number, season: Season): string {
  if (stage < 6) return `/gamification/stage-${stage}.png`;
  return `/gamification/stage-6-${season}.png`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function DamScene({
  size = "compact",
  data: dataProp,
}: {
  size?: "compact" | "full";
  data?: DamHomeData | null;
}) {
  const selfFetch = dataProp === undefined;
  const [fetched, setFetched] = useState<DamHomeData | null>(null);
  const [seasonOverride, setSeasonOverride] = useState<Season | null>(null);

  useEffect(() => {
    if (!selfFetch) return;
    let active = true;
    fetchDamHome().then((d) => active && setFetched(d));
    return () => {
      active = false;
    };
  }, [selfFetch]);

  const data = selfFetch ? fetched : dataProp;
  // No qualifying entry yet means there is no dam to show. The invitation to
  // start is the check-in button in the menu.
  if (!data || data.entryCount < 1) return null;

  const full = size === "full";
  const dim = full ? 420 : 240;
  const spriteDim = full ? 56 : 44;
  const sprite = SPRITE[data.todayState];

  // "Сезоны у плотины": a cosmetic touch on the full scene once unlocked — a
  // season label, a gentle season-matched tint, and (at stage 6) a manual pick.
  const seasonsUnlocked = full && data.unlocks.includes("seasons");
  const season = seasonOverride ?? currentSeason();

  return (
    <div className={`dam-scene ${full ? "dam-full" : "dam-compact"}`}>
      <Image
        className={`dam-illustration ${seasonsUnlocked ? `dam-season--${season}` : ""}`}
        src={stageSrc(data.stage, season)}
        width={dim}
        height={dim}
        alt={data.stageTitle}
        priority={!full}
      />

      {seasonsUnlocked && (
        <div className="dam-season">
          {data.stage === 6 ? (
            <div className="miniapp-word-grid">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`miniapp-word-chip ${season === s ? "active" : ""}`}
                  onClick={() => setSeasonOverride(s)}
                >
                  {SEASON_LABEL[s]}
                </button>
              ))}
            </div>
          ) : (
            <p className="hint">Сейчас у плотины: {SEASON_LABEL[season]}.</p>
          )}
        </div>
      )}

      <div className="dam-today">
        <Image src={sprite.src} width={spriteDim} height={spriteDim} alt={sprite.alt} />
        <p className="dam-status">{data.statusLine}</p>
      </div>

      {data.welcomeBackLine && <p className="dam-welcome">{data.welcomeBackLine}</p>}

      {full && data.milestones.length > 0 && (
        <ol className="dam-timeline">
          {data.milestones.map((m) => {
            const info = STAGES[Math.min(Math.max(m.stage, 1), STAGES.length) - 1];
            return (
              <li key={m.stage}>
                <span className="dam-timeline-mark" aria-hidden="true" />
                <div>
                  <p className="dam-timeline-title">
                    {info.title} <span className="dam-timeline-date">{fmtDate(m.reachedAt)}</span>
                  </p>
                  <p className="dam-timeline-copy">{info.milestoneCopy}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
