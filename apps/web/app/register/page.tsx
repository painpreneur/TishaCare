"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PracticeType } from "@/lib/practiceType";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [practiceType, setPracticeType] = useState<PracticeType>("clinic");
  const [clinicName, setClinicName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // An invite link (?clinic_invite=<token>) joins the colleague to an existing
  // clinic as a member: we resolve it to the clinic name and drop the
  // practice-type / clinic-name inputs.
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteClinic, setInviteClinic] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("clinic_invite");
    if (!token) return;
    setInviteToken(token);
    setInviteChecking(true);
    fetch(`/api/clinic/invites/resolve?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) setInviteClinic(data.clinicName);
        else setInviteError(data.error ?? "Приглашение недействительно");
      })
      .catch(() => setInviteError("Не удалось проверить приглашение"))
      .finally(() => setInviteChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        practiceType,
        clinicName,
        clinicInviteToken: inviteClinic ? inviteToken : undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось зарегистрироваться");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const joiningClinic = !!inviteClinic;

  if (inviteToken && inviteChecking) {
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1>TishaCare</h1>
          <p className="subtitle">Проверяем приглашение...</p>
        </div>
      </div>
    );
  }

  if (inviteToken && inviteError) {
    return (
      <div className="center-screen">
        <div className="login-card">
          <h1>TishaCare</h1>
          <p className="subtitle">Приглашение в клинику</p>
          <p className="error-text">{inviteError}</p>
          <p className="hint">
            Попросите администратора клиники прислать новую ссылку, или{" "}
            <Link href="/register">зарегистрируйтесь</Link> самостоятельно.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <div className="login-card">
        <h1>TishaCare</h1>
        <p className="subtitle">
          {joiningClinic ? `Регистрация в клинике «${inviteClinic}»` : "Регистрация врача"}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {!joiningClinic && (
            <>
              <div className="field">
                <label>Тип практики</label>
                <label className="choice">
                  <input
                    type="radio"
                    name="practiceType"
                    checked={practiceType === "clinic"}
                    onChange={() => setPracticeType("clinic")}
                  />
                  Работаю в клинике
                </label>
                <label className="choice">
                  <input
                    type="radio"
                    name="practiceType"
                    checked={practiceType === "solo"}
                    onChange={() => setPracticeType("solo")}
                  />
                  Самозанятый (частная практика)
                </label>
              </div>
              {practiceType === "clinic" && (
                <div className="field">
                  <label>Название клиники</label>
                  <input
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Клиника «Ремиссия»"
                    required
                  />
                </div>
              )}
            </>
          )}
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Регистрируем..." : "Зарегистрироваться"}
          </button>
        </form>
        <p className="hint">
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
