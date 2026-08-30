"use client";

import { useState } from "react";
import Link from "next/link";

// The doctor's own connect code. A patient types it into "Мои врачи" in the
// app; the request then shows up on the dashboard as "Запросы на подключение".
//   variant="full"   — the section on /dashboard/settings (code + explanation)
//   variant="inline" — one compact line on the dashboard, links to settings
export default function DoctorConnectCode({
  code,
  variant = "full",
}: {
  code: string;
  variant?: "full" | "inline";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the code is on screen to read
    }
  }

  if (variant === "inline") {
    return (
      <p className="doctor-code-inline">
        Ваш код для пациентов: <code>{code}</code>{" "}
        <button type="button" className="link-btn" onClick={copy}>
          {copied ? "Скопировано" : "Скопировать"}
        </button>{" "}
        · <Link href="/dashboard/settings">Настройки</Link>
      </p>
    );
  }

  return (
    <>
      <div className="care-code-row doctor-code-row">
        <code>{code}</code>
        <button type="button" className="link-btn" onClick={copy}>
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </div>
      <p className="hint">
        Дайте его пациенту (в сообщении, на визитке, на стойке). Пациент вводит код в приложении
        в разделе «Мои врачи», а вы подтверждаете запрос на дашборде, в «Запросах на подключение».
        Если пациент даёт свой код — используйте «+ Подключить пациента».
      </p>
    </>
  );
}
