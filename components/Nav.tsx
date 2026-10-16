"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Me {
  name: string;
  balanceCents: number;
}

function formatKES(cents: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function Nav() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/me");
        if (res.ok && active) setMe(await res.json());
      } catch {
        // Network error — keep showing the last known balance.
      }
    }
    poll();
    const id = setInterval(poll, 5_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-page px-6 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <Link href="/dashboard" className="text-xl font-bold text-text">
          Jackpesa
        </Link>
        <nav className="flex items-center gap-4">
          {me && (
            <Link
              href="/dashboard/wallet"
              className="rounded-lg bg-card px-3 py-1.5 text-sm font-semibold text-accent"
            >
              {formatKES(me.balanceCents)}
            </Link>
          )}
          <Link
            href="/dashboard/wallet"
            className="hidden text-sm font-medium text-text-muted hover:text-text sm:block"
          >
            Wallet
          </Link>
          <Link
            href="/dashboard/history"
            className="hidden text-sm font-medium text-text-muted hover:text-text sm:block"
          >
            History
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium text-text-muted hover:text-text"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
