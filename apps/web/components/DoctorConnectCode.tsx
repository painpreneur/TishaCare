"use client";

import { useState } from "react";

// The doctor's own connect code, shown on the dashboard. A patient types this
// into "Мои врачи" in the app; the request then appears here as "Запросы на
// подключение". Mirror of the patient's inviteCode for the other direction.
export default function DoctorConnectCode({ code }: { code: string }) {
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

  return (
    <div className="panel doctor-code-panel">
      <h3>Ваш код для пациентов</h3>
      <div className="care-code-row doctor-code-row">
        <code>{code}</code>
        <button type="button" className="link-btn" onClick={copy}>
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </div>
      <p className="hint">
        Дайте его пациенту (в сообщении, на визитке, на стойке). Пациент вводит код в приложении
        в разделе «Мои врачи», а вы подтверждаете запрос здесь, в «Запросах на подключение».
        Если пациент даёт свой код — используйте «+ Подключить пациента».
      </p>
    </div>
  );
}
