"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchDamHome, type DamHomeData } from "@/lib/damClient";
import { unlockInfo } from "@/lib/unlocks";
import BackLink from "@/components/miniapp/BackLink";

// "Открытия" as its own screen, in two parts:
//  - "Путь к первому приёму": an ordered checklist the patient can finish
//    before the first visit. Step progress IS shown here (it is an explicit
//    onboarding task). Completed steps note what they opened.
//  - "Со временем": the long-haul unlocks (volume / time / dam stage). No
//    order, no counters — earned ones read normally, the rest stay dimmed.

export default function DiscoveriesScreen() {
  const [data, setData] = useState<DamHomeData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDamHome().then((d) => {
      if (!active) return;
      setData(d);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="miniapp-card">
        <p className="empty">Загрузка...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="miniapp-card">
        <p className="empty">Пока нечего показать.</p>
      </div>
    );
  }

  const earned = new Set(data.unlocks);
  const { blockA, blockAComplete, blockB } = data.path;

  return (
    <div>
      <BackLink />

      <div className="miniapp-card">
        <h1>Открытия</h1>
        <p className="hint">
          Список из двух частей. Первую можно пройти к первому приёму, вторая идёт своим ходом.
        </p>
      </div>

      <div className="miniapp-card unlocks-section">
        <h3>Путь к первому приёму</h3>
        <ol className="path-list">
          {blockA.map((s) => {
            const grants = s.done ? s.grants.filter((c) => earned.has(c)) : [];
            return (
              <li key={s.id} className={`path-step ${s.done ? "done" : ""}`}>
                <span className="path-mark" aria-hidden>
                  {s.done ? "✓" : "○"}
                </span>
                <div>
                  <p className="path-step-title">{s.title}</p>
                  <p className="path-step-text">
                    {s.done
                      ? "Сделано"
                      : s.detail
                        ? `${s.hint} · ${s.detail}`
                        : s.hint}
                  </p>
                  {grants.length > 0 && (
                    <p className="path-grant">
                      Открылось: {grants.map((c) => unlockInfo(c)?.title ?? c).join(", ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {blockAComplete && (
          <p className="path-complete-note">
            Всё собрано. На приёме врачу будет с чего начать.
          </p>
        )}
      </div>

      <div className="miniapp-card unlocks-section">
        <h3>Со временем</h3>
        <ul className="unlocks-list">
          {blockB.map((u) => (
            <li key={u.code} className={`unlock-row ${u.open ? "" : "locked"}`}>
              <Image src={`/gamification/unlock-${u.code}.png`} width={44} height={44} alt="" />
              <div>
                <p className="unlock-row-title">{u.title}</p>
                <p className="unlock-row-text">{u.open ? u.copy : u.lockedHint}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
