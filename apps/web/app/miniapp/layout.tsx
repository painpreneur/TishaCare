export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="miniapp">
      <div className="miniapp-page">{children}</div>
    </div>
  );
}
