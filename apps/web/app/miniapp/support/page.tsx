"use client";

import { useState } from "react";
import { miniAppAuthHeaders } from "@/lib/miniappClient";
import BackLink from "@/components/miniapp/BackLink";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DISCLAIMER =
  "Это чат поддержки, а не замена консультации специалиста. При мыслях о причинении себе вреда как можно скорее свяжитесь с врачом или горячей линией психологической помощи.";

export default function SupportPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function send() {
    const text = value.trim();
    if (!text) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setValue("");
    setSending(true);

    const res = await fetch("/api/miniapp/support", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...miniAppAuthHeaders() },
      body: JSON.stringify({ messages: nextMessages }),
    });
    const data = await res.json();
    setSending(false);

    if (!data.available) {
      setUnavailable(true);
      return;
    }
    setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
  }

  return (
    <div>
      <BackLink />
      <div className="miniapp-card">
        <h1>Поддержка</h1>
        <p className="hint">{DISCLAIMER}</p>

        {unavailable && <p className="error-text">GPT-поддержка сейчас недоступна.</p>}

        <div className="miniapp-chat">
          {messages.map((m, i) => (
            <div key={i} className={`miniapp-chat-bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          {sending && <div className="miniapp-chat-bubble assistant">...</div>}
        </div>

        <div className="field">
          <textarea
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Напишите, что вас беспокоит"
          />
        </div>
        <button className="btn-primary btn-inline" onClick={send} disabled={sending || !value.trim()}>
          Отправить
        </button>
      </div>
    </div>
  );
}
