"use client";
import { useState } from "react";

type Direction = "left" | "center" | "right";
type Phase = "idle" | "shooting" | "result";

interface RoundResult {
  keeper: Direction; playerDirection: Direction;
  win: boolean; payoutCents: number; newBalanceCents: number;
  serverSeed: string; serverSeedHash: string;
  clientSeed: string; nonce: number; float: number;
}

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

const DIR_LABELS: Record<Direction, string> = { left: "← Left", center: "● Centre", right: "Right →" };
const DIR_EMOJI: Record<Direction, string> = { left: "⬅️", center: "⬆️", right: "➡️" };

export default function PenaltyShootoutPage() {
  const [direction, setDirection] = useState<Direction>("center");
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleShoot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setResult(null); setPhase("shooting");
    const clientSeed = crypto.randomUUID();
    const res = await fetch("/api/games/penalty-shootout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), direction, clientSeed }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setPhase("idle"); setError(data?.error ?? "Something went wrong."); return; }
    await new Promise(r => setTimeout(r, 1000));
    setResult(data); setPhase("result");
  }

  function reset() { setPhase("idle"); setResult(null); setError(null); }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Penalty Shootout</h1>
      <p className="mt-1 text-sm text-text-muted">Pick your corner. Beat the keeper. Win 1.47×.</p>

      {/* Goal display */}
      <div className="my-8 rounded-2xl bg-card p-6">
        {/* Goal frame */}
        <div className="relative mx-auto h-24 w-full max-w-xs rounded-t-xl border-4 border-b-0 border-zinc-400 bg-sky-100">
          {/* Keeper */}
          {phase === "result" && result ? (
            <div className={`absolute bottom-0 text-4xl transition-all duration-500 ${
              result.keeper === "left" ? "left-2" :
              result.keeper === "right" ? "right-2" : "left-1/2 -translate-x-1/2"
            }`}>
              🧤
            </div>
          ) : phase === "shooting" ? (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-bounce text-4xl">🧤</div>
          ) : (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl">🧤</div>
          )}
          {/* Ball */}
          {phase === "result" && result && (
            <div className={`absolute top-2 text-2xl transition-all duration-500 ${
              result.playerDirection === "left" ? "left-4" :
              result.playerDirection === "right" ? "right-4" : "left-1/2 -translate-x-1/2"
            }`}>
              ⚽
            </div>
          )}
        </div>
        {/* Ground */}
        <div className="h-4 rounded-b-xl bg-green-600" />

        {/* Result message */}
        {phase === "result" && result && (
          <div className="mt-4 text-center">
            <p className="font-bold text-text">
              {result.win ? "GOAL! 🎉" : "SAVED! 🧤"}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              You shot {result.playerDirection} • Keeper dived {result.keeper}
            </p>
            {result.win && <p className="mt-1 text-sm font-semibold text-accent">+{formatKES(result.payoutCents)}</p>}
            <p className="mt-1 text-sm text-text-muted">
              New balance: <span className="font-medium text-text">{formatKES(result.newBalanceCents)}</span>
            </p>
            <details className="mt-3 text-left text-xs text-text-muted">
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
      </div>

      {phase !== "shooting" && (
        <form onSubmit={handleShoot} className="flex flex-col gap-5" noValidate>
          <div className="flex gap-2">
            {(["left","center","right"] as Direction[]).map(d => (
              <button key={d} type="button" onClick={() => setDirection(d)}
                className={`flex-1 rounded-lg border px-2 py-3 text-sm font-semibold transition-colors ${direction===d?"border-accent bg-accent text-text":"border-zinc-300 bg-white text-text-muted"}`}>
                <span className="block text-lg">{DIR_EMOJI[d]}</span>
                {DIR_LABELS[d]}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            Bet amount (KES)
            <input className={inputClass} inputMode="numeric" placeholder="100" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,""))} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="submit" className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover">
            ⚽ Shoot!
          </button>
          {phase === "result" && (
            <button type="button" onClick={reset} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text">Shoot again</button>
          )}
        </form>
      )}
      {phase === "shooting" && <p className="mt-2 text-center text-sm text-text-muted">Shooting...</p>}
    </main>
  );
}
