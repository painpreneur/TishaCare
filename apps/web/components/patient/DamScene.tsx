"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import { STAGES } from "@/lib/gamification";

// "Плотина Тиши" scene. Rewards the act of regular recording, never the content.
// The beaver lives inside each stage illustration, so the "today" sprite is a
// small indicator beside the status line, not an overlay on the scene.

type TodayState = "added" | "done" | "pending";

interface DamData {
  stage: number;
  stageTitle: string;
  statusLine: string;
  todayState: TodayState;
  welcomeBackLine: string | null;
  milestones: { stage: number; reachedAt: string }[];
}

const SPRITE: Record<TodayState, { src: string; alt: string }> = {
  added: { src: "/gamification/tisha-today-active.png", alt: "Тиша кладёт веточку" },
  done: { src: "/gamification/tisha-today-content.png", alt: "Тиша сидит рядом" },
  pending: { src: "/gamification/tisha-today-pending.png", alt: "Тиша смотрит на воду" },
};

function stageSrc(stage: number): string {
  if (stage < 6) return `/gamification/stage-${stage}.png`;
  const m = new Date().getMonth();
  const season =
    m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
  return `/gamification/stage-6-${season}.png`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function DamScene({ size = "compact" }: { size?: "compact" | "full" }) {
  const [data, setData] = useState<DamData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/miniapp/dam", { headers: miniAppAuthHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: DamData) => active && setData(d))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  // A decorative-but-meaningful surface: on any error just render nothing.
  if (failed || !data) return null;

  const full = size === "full";
  const dim = full ? 420 : 260;
  const spriteDim = full ? 56 : 44;
  const sprite = SPRITE[data.todayState];

  return (
    <div className={`dam-scene ${full ? "dam-full" : "dam-compact"}`}>
      <Image
        className="dam-illustration"
        src={stageSrc(data.stage)}
        width={dim}
        height={dim}
        alt={data.stageTitle}
        priority={!full}
      />

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
