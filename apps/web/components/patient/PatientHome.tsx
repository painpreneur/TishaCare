"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";
import { usePatientBasePath } from "@/lib/patientPortal";
import { INTRO_SEEN_KEY } from "@/lib/intro";
import FeatureGrid from "./FeatureGrid";
import DamScene from "./DamScene";
import MilestoneCard from "./MilestoneCard";
import UnlockCard from "./UnlockCard";
import ActivityBlock from "./ActivityBlock";
import DoctorMessages from "./DoctorMessages";
import { fetchDamHome, type DamHomeData } from "@/lib/damClient";
import type { PatientFeature } from "./patientFeature";

export type { PatientFeature };

function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

// Shared home for /miniapp and /app: runs the consent -> onboarding gate, then
// shows the daily pair (primary) and the rest of the menu (features).
export default function PatientHome({
  primary,
  features,
}: {
  primary: PatientFeature[];
  features: PatientFeature[];
}) {
  const router = useRouter();
  const base = usePatientBasePath();
  const [patientName, setPatientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [damData, setDamData] = useState<DamHomeData | null>(null);

  useEffect(() => {
    // Guards against React StrictMode's double-invoke in dev and against the
    // fetch resolving after the user has already navigated away (a late
    // router.replace would yank them off the page they moved to).
    let active = true;

    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();

    fetch("/api/miniapp/session", { headers: miniAppAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.needsConsent) {
          // New patient: show the one-time intro before the consent step
          // (Mini App only, once per device). Everyone else skips straight
          // to consent.
          const next = base === "/miniapp" && !introSeen() ? "/intro" : "/consent";
          router.replace(withDevTelegramIdParam(`${base}${next}`));
          return;
        }
        if (data.needsOnboarding) {
          router.replace(withDevTelegramIdParam(`${base}/profile?onboarding=1`));
          return;
        }
        setPatientName(data.patientName);
        // one fetch for MilestoneCard + ActivityBlock + DamScene
        fetchDamHome().then((d) => active && setDamData(d));
      })
      .catch(() => {
        if (!active) return;
        setError(
          base === "/app"
            ? "Сессия истекла. Войдите заново."
            : "Не удалось определить пациента. Откройте это приложение через бота TishaCare."
        );
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="miniapp-card">
        <p className="error-text">{error}</p>
        {base === "/app" && (
          <Link href="/app/login" className="btn-primary btn-inline" style={{ marginTop: 12 }}>
            Войти
          </Link>
        )}
      </div>
    );
  }

  if (!patientName) {
    return (
      <div className="miniapp-card">
        <p className="empty">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="patient-home-head">
        <h1>Здравствуйте, {patientName}!</h1>
        <Link
          href={withDevTelegramIdParam(`${base}/profile`)}
          className="patient-home-profile"
          aria-label="Профиль"
          title="Профиль"
        >
          ⚙
        </Link>
      </div>
      <Link
        href={withDevTelegramIdParam(`${base}/safety`)}
        className="patient-home-safety"
      >
        План на трудный момент
      </Link>
      <DoctorMessages />
      <MilestoneCard data={damData} />
      <UnlockCard data={damData} />
      <ActivityBlock data={damData} />
      <FeatureGrid features={primary} cardClassName="primary" />
      <div style={{ height: 12 }} />
      <FeatureGrid features={features} />
      <DamScene size="compact" data={damData} />
    </div>
  );
}
