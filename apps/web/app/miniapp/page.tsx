"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";

const FEATURES = [
  { href: "/miniapp/checkin", emoji: "📝", title: "Чек-ин", desc: "Настроение, сон, энергия, лекарства" },
  { href: "/miniapp/medications", emoji: "💊", title: "Медикаменты", desc: "Список и приём" },
  { href: "/miniapp/thoughts", emoji: "📓", title: "Дневник мыслей", desc: "Записать, что беспокоит" },
  { href: "/miniapp/support", emoji: "🧠", title: "Поддержка", desc: "Чат с GPT-ассистентом" },
  { href: "/miniapp/beck", emoji: "📋", title: "Депрессия (Бек)", desc: "Опросник, 21 вопрос" },
  { href: "/miniapp/mdq", emoji: "📋", title: "Мания (MDQ)", desc: "Скрининг биполярного спектра" },
  { href: "/miniapp/cognitive-test", emoji: "🧩", title: "Когнитивный тест", desc: "~10 минут, память и внимание" },
  { href: "/miniapp/profile", emoji: "👤", title: "Профиль", desc: "Данные и код подключения к врачу" },
];

export default function MiniAppHome() {
  const router = useRouter();
  const [patientName, setPatientName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();

    fetch("/api/miniapp/session", { headers: miniAppAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.needsOnboarding) {
          router.replace(withDevTelegramIdParam("/miniapp/profile?onboarding=1"));
          return;
        }
        setPatientName(data.patientName);
      })
      .catch(() => setError("Не удалось определить пациента. Откройте это приложение через бота TishaCare."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="miniapp-card">
        <p className="error-text">{error}</p>
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
        {FEATURES.map((f) => (
          <Link key={f.href} href={withDevTelegramIdParam(f.href)} className="miniapp-menu-card">
            <span className="miniapp-menu-emoji">{f.emoji}</span>
            <span className="miniapp-menu-title">{f.title}</span>
            <span className="miniapp-menu-desc">{f.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
