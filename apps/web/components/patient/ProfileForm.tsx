"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { miniAppAuthHeaders, withDevTelegramIdParam } from "@/lib/miniappClient";
import { usePatientBasePath } from "@/lib/patientPortal";
import BackLink from "@/components/miniapp/BackLink";

interface Profile {
  name: string;
  birthDate: string | null;
  inviteCode: string;
  doctorConnected: boolean;
}

const MIN_BIRTH_DATE = "1920-01-01";

// Shared by /miniapp/profile and /app/profile. `?onboarding=1` switches copy
// and, on save, sends the patient back to the surface home.
export default function ProfileForm() {
  return (
    <Suspense fallback={<div className="miniapp-card"><p className="empty">Загрузка...</p></div>}>
      <ProfileFormInner />
    </Suspense>
  );
}

function ProfileFormInner() {
  const router = useRouter();
  const base = usePatientBasePath();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch("/api/miniapp/profile", { headers: miniAppAuthHeaders() })
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name);
        setBirthDate(data.birthDate ?? "");
      });
  }, []);

  async function save() {
    if (!name.trim() || !birthDate) {
      setError("Укажите имя и дату рождения");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/miniapp/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ name, birthDate }),
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
      router.replace(withDevTelegramIdParam(base));
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
          <label>Дата рождения</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            min={MIN_BIRTH_DATE}
            max={today}
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
