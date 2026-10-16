"use client";

import { useState } from "react";

type Phase = "idle" | "spinning" | "result";

interface RoundResult {
  reels: string[];
  win: boolean;
  payoutCents: number;
  newBalanceCents: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  float: number;
}

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

export default function SlotsPage() {
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [displayReels, setDisplayReels] = useState(["🎰", "🎰", "🎰"]);
  const [error, setError] = useState<string | null>(null);

  const SYMBOLS = ["🍋", "🍊", "🍇", "🔔", "⭐", "💎"];

  async function handleSpin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setPhase("spinning");

    // Animate reels while waiting for result.
    let tick = 0;
    const interval = setInterval(() => {
      setDisplayReels([
        SYMBOLS[tick % SYMBOLS.length],
        SYMBOLS[(tick + 2) % SYMBOLS.length],
        SYMBOLS[(tick + 4) % SYMBOLS.length],
      ]);
      tick++;
    }, 100);

    const clientSeed = crypto.randomUUID();
    const response = await fetch("/api/games/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), clientSeed }),
    });

    const data = await response.json().catch(() => null);
    clearInterval(interval);

    if (!response.ok) {
      setPhase("idle");
      setDisplayReels(["🎰", "🎰", "🎰"]);
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setDisplayReels(data.reels);
    setResult(data);
    setPhase("result");
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setError(null);
    setDisplayReels(["🎰", "🎰", "🎰"]);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Slot Machine</h1>
      <p className="mt-1 text-sm text-text-muted">Match 3 symbols to win. Diamond pays 25×.</p>

      {/* Reels */}
      <div className="my-8 flex justify-center gap-3">
        {displayReels.map((sym, i) => (
          <div
            key={i}
            className={`flex h-24 w-24 items-center justify-center rounded-2xl text-5xl shadow-md transition-all ${
              phase === "spinning" ? "animate-pulse bg-accent" : "bg-card"
            } ${phase === "result" && result?.win ? "ring-2 ring-accent" : ""}`}
          >
            {sym}
          </div>
        ))}
      </div>

      {/* Paytable */}
      <div className="mb-6 rounded-xl bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Paytable</p>
        <div className="grid grid-cols-3 gap-1 text-xs text-text-muted">
          {[["🍋🍋🍋","1.5×"],["🍊🍊🍊","2×"],["🍇🍇🍇","3×"],["🔔🔔🔔","5×"],["⭐⭐⭐","10×"],["💎💎💎","25×"]].map(([combo, mult]) => (
            <div key={combo} className="flex items-center gap-1">
              <span>{combo}</span>
              <span className="font-medium text-accent">{mult}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      {phase === "result" && result && (
        <div className={`mb-6 rounded-2xl p-5 text-center ${result.win ? "bg-amber-50" : "bg-zinc-100"}`}>
          <p className="text-lg font-bold text-text">
            {result.win ? "Jackpot! 🎉" : "No match. Try again."}
          </p>
          {result.win && (
            <p className="mt-1 text-sm font-semibold text-accent">+{formatKES(result.payoutCents)}</p>
          )}
          <p className="mt-2 text-sm text-text-muted">
            New balance: <span className="font-medium text-text">{formatKES(result.newBalanceCents)}</span>
          </p>
          <details className="mt-4 text-left text-xs text-text-muted">
            <summary className="cursor-pointer font-medium">Verify this round</summary>
            <div className="mt-2 flex flex-col gap-1 break-all font-mono">
              <span>Server seed: {result.serverSeed}</span>
              <span>Hash: {result.serverSeedHash}</span>
              <span>Client seed: {result.clientSeed}</span>
              <span>Nonce: {result.nonce}</span>
              <span>Float: {result.float.toFixed(10)}</span>
              <a href="/verify" target="_blank" className="mt-1 text-accent underline">Open verifier →</a>
            </div>
          </details>
        </div>
      )}

      {phase !== "spinning" && (
        <form onSubmit={handleSpin} className="flex flex-col gap-5" noValidate>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            Bet amount (KES)
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover"
          >
            Spin
          </button>
          {phase === "result" && (
            <button type="button" onClick={reset} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text">
              Spin again
            </button>
          )}
        </form>
      )}
      {phase === "spinning" && (
        <p className="text-center text-sm text-text-muted">Spinning reels...</p>
      )}
    </main>
  );
}
