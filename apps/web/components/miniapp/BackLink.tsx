"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePatientHomeHref } from "@/lib/patientPortal";

// "Домой" lives on the right edge, about a third of the way up from the bottom
// — where a right thumb rests on a one-handed grip. It is also reachable by a
// pull-in swipe: start within a few mm of the right edge and drag left.
// The edge-start requirement keeps this from clashing with content swipes
// (e.g. the check-in wizard changing steps).
const EDGE_START_PX = 28;
const MIN_DX = 60;
const MAX_DY = 50;
const MAX_MS = 600;

export default function BackLink() {
  const href = usePatientHomeHref();
  const router = useRouter();

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    let st = 0;
    let armed = false;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      armed = t.clientX >= window.innerWidth - EDGE_START_PX;
      sx = t.clientX;
      sy = t.clientY;
      st = Date.now();
    }
    function onEnd(e: TouchEvent) {
      if (!armed) return;
      armed = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (dx <= -MIN_DX && Math.abs(dy) <= MAX_DY && Date.now() - st <= MAX_MS) {
        router.push(href);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [href, router]);

  return (
    <Link href={href} className="patient-home-btn" aria-label="На главный экран">
      <span aria-hidden="true">⌂</span>
      Домой
    </Link>
  );
}
