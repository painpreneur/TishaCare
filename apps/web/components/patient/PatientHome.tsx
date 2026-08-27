"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";
import { usePatientBasePath } from "@/lib/patientPortal";

export interface PatientFeature {
  /** Path relative to the surface root, e.g. "/checkin". */
  href: string;
  emoji: string;
  title: string;
  desc: string;
}

// Shared home for /miniapp and /app: runs the consent -> onboarding gate, then
// shows the surface's feature menu.
export default function PatientHome({ features }: { features: PatientFeature[] }) {
  const router = useRouter();
  const base = usePatientBasePath();
  const [patientName, setPatientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          router.replace(withDevTelegramIdParam(`${base}/consent`));
          return;
        }
        if (data.needsOnboarding) {
          router.replace(withDevTelegramIdParam(`${base}/profile?onboarding=1`));
          return;
        }
        setPatientName(data.patientName);
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
      <div className="miniapp-card" style={{ marginBottom: 16 }}>
        <h1>Здравствуйте, {patientName}!</h1>
        <p className="hint">Выберите, чем хотите заняться.</p>
      </div>
      <div className="miniapp-menu-grid">
        {features.map((f) => (
          <Link
            key={f.href}
            href={withDevTelegramIdParam(`${base}${f.href}`)}
            className="miniapp-menu-card"
          >
            <span className="miniapp-menu-emoji">{f.emoji}</span>
            <span className="miniapp-menu-title">{f.title}</span>
            <span className="miniapp-menu-desc">{f.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
