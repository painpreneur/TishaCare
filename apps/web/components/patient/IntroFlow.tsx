"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePatientBasePath } from "@/lib/patientPortal";
import { withDevTelegramIdParam } from "@/lib/miniappClient";
import { INTRO_STEPS, INTRO_CTA, INTRO_SEEN_KEY } from "@/lib/intro";

// One-time intro shown before the consent step (see PatientHome's gate).
// Shared by /miniapp and /app via usePatientBasePath.
export default function IntroFlow() {
  const router = useRouter();
  const base = usePatientBasePath();
  const [step, setStep] = useState(0);

  const current = INTRO_STEPS[step];
  const last = step === INTRO_STEPS.length - 1;

  function finish() {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Private mode / storage disabled — worst case the intro shows again
      // next visit, which is harmless.
    }
    router.replace(withDevTelegramIdParam(`${base}/consent`));
  }

  return (
    <div className="miniapp-card intro-card">
      <div className="intro-emoji" aria-hidden>
        {current.emoji}
      </div>
      <h1>{current.title}</h1>
      <p className="intro-body">{current.body}</p>

      <div className="intro-dots" aria-hidden>
        {INTRO_STEPS.map((_, i) => (
          <span key={i} className={i === step ? "intro-dot active" : "intro-dot"} />
        ))}
      </div>

      <button
        className="btn-primary btn-inline"
        onClick={() => (last ? finish() : setStep(step + 1))}
      >
        {last ? INTRO_CTA : "Дальше"}
      </button>

      {!last && (
        <button className="intro-skip" onClick={finish}>
          Пропустить
        </button>
      )}
    </div>
  );
}
