"use client";
import { useState } from "react";

type Phase = "idle" | "loading" | "scratching" | "result";

interface Cell { symbol: string; multiplier: number; }
interface RoundResult {
  grid: Cell[];
  win: boolean; payoutCents: number; newBalanceCents: number;
  serverSeed: string; serverSeedHash: string;
  clientSeed: string; nonce: number; float: number;
}

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

export default function ScratchAndWinPage() {
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false));
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setResult(null);
    setRevealed(Array(9).fill(false)); setPhase("loading");

    const clientSeed = crypto.randomUUID();
    const res = await fetch("/api/games/scratch-and-win", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), clientSeed }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setPhase("idle"); setError(data?.error ?? "Something went wrong."); return; }
    setResult(data); setPhase("scratching");
  }

  function revealCell(i: number) {
    if (phase !== "scratching") return;
    setRevealed(prev => {
      const next = [...prev];
      next[i] = true;
      // If all revealed, move to result.
      if (next.every(Boolean)) setTimeout(() => setPhase("result"), 400);
      return next;
    });
  }

  function revealAll() {
    setRevealed(Array(9).fill(true));
    setTimeout(() => setPhase("result"), 400);
  }

  function reset() { setPhase("idle"); setResult(null); setRevealed(Array(9).fill(false)); setError(null); }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Scratch & Win</h1>
      <p className="mt-1 text-sm text-text-muted">Scratch 9 cells. Match 3 symbols to win.</p>

      {/* Scratch grid */}
      {(phase === "scratching" || phase === "result") && result && (
        <div className="my-6">
          <div className="grid grid-cols-3 gap-3">
            {result.grid.map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => revealCell(i)}
                className={`flex h-20 w-full items-center justify-center rounded-xl text-3xl shadow transition-all ${
                  revealed[i] ? "bg-card" : "bg-zinc-700 hover:bg-zinc-600 active:scale-95"
                }`}
              >
                {revealed[i] ? cell.symbol : "🪙"}
              </button>
            ))}
          </div>
          {phase === "scratching" && (
            <button type="button" onClick={revealAll} className="mt-4 w-full rounded-lg border border-zinc-300 py-2 text-sm text-text-muted hover:text-text">
              Reveal all
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {phase === "result" && result && (
        <div className={`mb-6 rounded-2xl p-5 text-center ${result.win ? "bg-amber-50" : "bg-zinc-100"}`}>
          <p className="text-lg font-bold text-text">{result.win ? "You won! 🎉" : "No match. Try again."}</p>
          {result.win && <p className="mt-1 text-sm font-semibold text-accent">+{formatKES(result.payoutCents)}</p>}
          <p className="mt-2 text-sm text-text-muted">New balance: <span className="font-medium text-text">{formatKES(result.newBalanceCents)}</span></p>
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

      {phase === "idle" && (
        <form onSubmit={handleBuy} className="mt-6 flex flex-col gap-5" noValidate>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            Bet amount (KES)
            <input className={inputClass} inputMode="numeric" placeholder="100" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,""))} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="submit" className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover">Buy scratch card</button>
        </form>
      )}

      {phase === "loading" && <p className="mt-6 text-center text-sm text-text-muted">Generating card...</p>}

      {phase === "result" && (
        <button type="button" onClick={reset} className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text">Buy another card</button>
      )}

      {/* Paytable */}
      <div className="mt-8 rounded-xl bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Match 3 to win</p>
        <div className="flex flex-col gap-1 text-sm">
          {[["💎","10×"],["⭐","5×"],["🔔","3×"],["🍊","2×"]].map(([sym,mult]) => (
            <div key={sym} className="flex justify-between">
              <span>{sym} {sym} {sym}</span>
              <span className="font-semibold text-accent">{mult}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
