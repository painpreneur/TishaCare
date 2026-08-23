"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

interface Profile {
  name: string;
  birthYear: number | null;
  inviteCode: string;
  doctorConnected: boolean;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="miniapp-card"><p className="empty">Загрузка...</p></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/miniapp/profile", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name);
        setBirthYear(data.birthYear ? String(data.birthYear) : "");
      });
  }, []);

  async function save() {
    const year = Number(birthYear);
    if (!name.trim() || !Number.isInteger(year)) {
      setError("Укажите имя и год рождения");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/miniapp/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ name, birthYear: year }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить");
      return;
    }
    const updated = await res.json();
    setProfile(updated);
    if (onboarding) {
      router.replace(withDevTelegramIdParam("/miniapp"));
    }
  }

  if (!profile) {
    return (
      <div className="miniapp-card">
        <p className="empty">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      {!onboarding && <BackLink />}
      <div className="miniapp-card">
        {onboarding ? (
          <>
            <h1>Добро пожаловать!</h1>
            <p className="hint">Пара вопросов, чтобы правильно оформить вашу карточку.</p>
          </>
        ) : (
          <h1>Профиль</h1>
        )}

        <div className="field">
          <label>Имя</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Год рождения</label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="1990"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary btn-inline" onClick={save} disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>

        {!onboarding && (
          <p className="hint" style={{ marginTop: 16 }}>
            {profile.doctorConnected ? (
              "Вы подключены к врачу."
            ) : (
              <>
                Вы ещё не подключены к врачу. Ваш код: <strong>{profile.inviteCode}</strong>
                <br />
                Сообщите его своему врачу.
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
