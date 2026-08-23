import Script from "next/script";

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="miniapp">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <div className="miniapp-page">{children}</div>
    </div>
  );
}
