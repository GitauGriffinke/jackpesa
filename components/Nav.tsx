"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

function formatKES(cents: number) {
  return "KES " + Math.floor(cents / 100).toLocaleString("en-KE");
}

export default function Nav() {
  const [balance, setBalance] = useState<number | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const data = await res.json();
        setBalance(data.balanceCents);
        setName(data.name ?? "");
      } catch { /* ignore */ }
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🎰</span>
          <span className="text-lg font-bold tracking-tight text-accent">Jackpesa</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {balance !== null && (
            <Link
              href="/dashboard/wallet"
              className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent hover:bg-accent/20 transition-colors"
            >
              {formatKES(balance)}
            </Link>
          )}
          <Link
            href="/dashboard/wallet"
            className="hidden sm:block rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            Wallet
          </Link>
          <Link
            href="/dashboard/history"
            className="hidden sm:block rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            History
          </Link>
          {initials && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-page">
              {initials}
            </div>
          )}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors">
              Out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
