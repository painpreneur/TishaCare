import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "TishaCare: панель врача",
  description: "Мониторинг пациентов с БАР",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {/* Telegram Mini App SDK. `beforeInteractive` is only honoured in the
            root layout (App Router), so it lives here rather than in
            app/miniapp/layout.tsx, otherwise window.Telegram.WebApp is not
            ready when the client components mount and initData never gets
            sent. Harmless (~1 KB, just defines window.Telegram) on the
            doctor panel routes. */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
