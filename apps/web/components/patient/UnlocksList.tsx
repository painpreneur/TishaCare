"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UNLOCKS } from "@/lib/unlocks";
import { fetchDamHome } from "@/lib/damClient";

// "Открытия" section on /progress: all unlocks, earned ones shown normally with
// their copy, not-yet-earned ones dimmed with a plain statement of the trigger.
// No counter, no progress bar for a locked one.

export default function UnlocksList() {
  const [unlocks, setUnlocks] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchDamHome().then((d) => active && setUnlocks(d?.unlocks ?? []));
    return () => {
      active = false;
    };
  }, []);

  if (unlocks === null) return null;
  const earned = new Set(unlocks);

  return (
    <div className="miniapp-card unlocks-section">
      <h3>Открытия</h3>
      <ul className="unlocks-list">
        {UNLOCKS.map((u) => {
          const open = earned.has(u.code);
          return (
            <li key={u.code} className={`unlock-row ${open ? "" : "locked"}`}>
              <Image
                src={`/gamification/unlock-${u.code}.png`}
                width={44}
                height={44}
                alt=""
              />
              <div>
                <p className="unlock-row-title">{u.title}</p>
                <p className="unlock-row-text">{open ? u.copy : u.lockedHint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
