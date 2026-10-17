"use client";
import { useState } from "react";

type BetType = "red" | "black" | "green" | "odd" | "even";
type Phase = "idle" | "spinning" | "result";

interface RoundResult {
  slot: number; color: string;
  win: boolean; payoutCents: number; newBalanceCents: number;
  serverSeed: string; serverSeedHash: string;
  clientSeed: string; nonce: number; float: number;
}

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

const BET_OPTIONS: { type: BetType; label: string; payout: string; bg: string }[] = [
  { type: "red",   label: "Red",   payout: "2×", bg: "bg-red-500 text-white" },
  { type: "black", label: "Black", payout: "2×", bg: "bg-zinc-900 text-white" },
  { type: "green", label: "Green", payout: "13×",bg: "bg-green-600 text-white" },
  { type: "odd",   label: "Odd",   payout: "2×", bg: "bg-zinc-200 text-zinc-900" },
  { type: "even",  label: "Even",  payout: "2×", bg: "bg-zinc-200 text-zinc-900" },
];

const slotColor = (s: number) => s === 0 ? "bg-green-600" : [1,2,3,4,5,6].includes(s) ? "bg-red-500" : "bg-zinc-900";

export default function MiniRoulettePage() {
  const [betType, setBetType] = useState<BetType>("red");
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displaySlot, setDisplaySlot] = useState<number | null>(null);

  async function handleSpin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setResult(null); setPhase("spinning");

    let tick = 0;
    const interval = setInterval(() => { setDisplaySlot(tick % 13); tick++; }, 80);

    const clientSeed = crypto.randomUUID();
    const res = await fetch("/api/games/mini-roulette", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), betType, clientSeed }),
    });
    const data = await res.json().catch(() => null);
    clearInterval(interval);

    if (!res.ok) { setPhase("idle"); setDisplaySlot(null); setError(data?.error ?? "Something went wrong."); return; }
    setDisplaySlot(data.slot);
    setResult(data); setPhase("result");
  }

  function reset() { setPhase("idle"); setResult(null); setDisplaySlot(null); setError(null); }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Mini Roulette</h1>
      <p className="mt-1 text-sm text-text-muted">13 slots: 0 green, 1–6 red, 7–12 black.</p>

      {/* Wheel display */}
      <div className="my-8 flex justify-center">
        <div className={`flex h-32 w-32 flex-col items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 ${displaySlot !== null ? slotColor(displaySlot) : "bg-card"}`}>
          {displaySlot !== null ? (
            <>
              <span className="text-4xl font-bold">{displaySlot}</span>
              <span className="text-xs capitalize">{displaySlot === 0 ? "green" : [1,2,3,4,5,6].includes(displaySlot) ? "red" : "black"}</span>
            </>
          ) : (
            <span className="text-4xl">🎯</span>
          )}
        </div>
      </div>

      {/* Result */}
      {phase === "result" && result && (
        <div className={`mb-6 rounded-2xl p-5 text-center ${result.win ? "bg-amber-50" : "bg-zinc-100"}`}>
          <p className="text-lg font-bold text-text">{result.win ? "You won! 🎉" : "You lost."}</p>
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

      {phase !== "spinning" && (
        <form onSubmit={handleSpin} className="flex flex-col gap-5" noValidate>
          <div className="grid grid-cols-3 gap-2">
            {BET_OPTIONS.map(opt => (
              <button key={opt.type} type="button" onClick={() => setBetType(opt.type)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${betType === opt.type ? `${opt.bg} ring-2 ring-offset-1 ring-accent` : "bg-card text-text"}`}>
                {opt.label} <span className="text-xs opacity-75">{opt.payout}</span>
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            Bet amount (KES)
            <input className={inputClass} inputMode="numeric" placeholder="100" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,""))} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="submit" className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover">Spin</button>
          {phase === "result" && (
            <button type="button" onClick={reset} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text">Spin again</button>
          )}
        </form>
      )}
      {phase === "spinning" && <p className="text-center text-sm text-text-muted">Spinning...</p>}
    </main>
  );
}
