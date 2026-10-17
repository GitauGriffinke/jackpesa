import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg w-full">
        <span className="text-7xl">🎰</span>
        <h1 className="mt-4 text-5xl font-bold text-accent">Jackpesa</h1>
        <p className="mt-3 text-lg text-text-muted">Kenya&apos;s demo casino. 10 games. No real money.</p>
        <div className="mt-2 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-medium text-accent">
          DEMO — Sandbox only. No real money.
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/signup" className="rounded-xl bg-accent px-8 py-4 text-base font-bold text-page transition-colors hover:bg-accent-hover">
            🎮 Play free — Get KES 10,000
          </Link>
          <Link href="/login" className="rounded-xl border-2 border-accent/50 px-8 py-4 text-base font-bold text-accent transition-colors hover:bg-accent/10">
            🔑 Log in to existing account
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-5 gap-2">
          {["🚀","🎲","🎡","🎰","⚽","🃏","🎯","📍","🎟️","🪙"].map((emoji, i) => (
            <div key={i} className="rounded-xl border border-border bg-card py-3 text-2xl">
              {emoji}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-muted">10 games available</p>
      </div>
    </main>
  );
}
