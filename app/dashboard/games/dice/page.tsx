"use client";

import { useState } from "react";

type Phase = "idle" | "rolling" | "result";

interface RoundResult {
  roll: number;
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
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(cents / 100);
}

function winChance(target: number, over: boolean) {
  return over ? 99 - target : target;
}

function multiplier(target: number, over: boolean) {
  const chance = winChance(target, over) / 100;
  if (chance <= 0) return 0;
  return (0.99 / chance).toFixed(4);
}

export default function DicePage() {
  const [target, setTarget] = useState(50);
  const [over, setOver] = useState(true);
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setPhase("rolling");

    const clientSeed = crypto.randomUUID();
    const response = await fetch("/api/games/dice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountKes: Number(amount),
        target,
        over,
        clientSeed,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setPhase("idle");
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    await new Promise((r) => setTimeout(r, 800));
    setResult(data);
    setPhase("result");
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setError(null);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
        ← Back
      </a>
      <h1 className="mt-4 text-2xl font-bold text-text">Dice Roll</h1>
      <p className="mt-1 text-sm text-text-muted">
        Roll 0–99. Pick over or under your target.
      </p>

      {/* Dice display */}
      <div className="my-8 flex flex-col items-center gap-2">
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-2xl text-4xl shadow-md transition-all ${
            phase === "rolling" ? "animate-bounce bg-accent" : "bg-card"
          }`}
        >
          {phase === "result" && result
            ? result.roll.toFixed(2)
            : "🎲"}
        </div>
        {phase === "result" && result && (
          <p
            className={`text-sm font-semibold ${
              result.win ? "text-accent" : "text-danger"
            }`}
          >
            {result.win ? `You won! +${formatKES(result.payoutCents)}` : "You lost."}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-6 flex justify-between rounded-xl bg-card px-5 py-3 text-sm">
        <div>
          <p className="text-xs text-text-muted">Win chance</p>
          <p className="font-semibold text-text">{winChance(target, over)}%</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Multiplier</p>
          <p className="font-semibold text-text">{multiplier(target, over)}×</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Target</p>
          <p className="font-semibold text-text">
            {over ? ">" : "<"} {target}
          </p>
        </div>
      </div>

      {phase !== "rolling" && (
        <form onSubmit={handleBet} className="flex flex-col gap-5" noValidate>
          {/* Over / Under toggle */}
          <div className="flex gap-3">
            {([true, false] as boolean[]).map((isOver) => (
              <button
                key={String(isOver)}
                type="button"
                onClick={() => setOver(isOver)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                  over === isOver
                    ? "border-accent bg-accent text-text"
                    : "border-zinc-300 bg-white text-text-muted"
                }`}
              >
                {isOver ? "Over" : "Under"}
              </button>
            ))}
          </div>

          {/* Target slider */}
          <label className="flex flex-col gap-2 text-sm font-medium text-text">
            Target: {target}
            <input
              type="range"
              min={2}
              max={98}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="accent-amber-600"
            />
          </label>

          {/* Bet amount */}
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

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-text focus-visible:outline-none"
          >
            Roll dice
          </button>

          {phase === "result" && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text"
            >
              Roll again
            </button>
          )}
        </form>
      )}

      {phase === "rolling" && (
        <p className="text-center text-sm text-text-muted">Rolling...</p>
      )}

      {/* Provably fair proof */}
      {phase === "result" && result && (
        <details className="mt-6 text-xs text-text-muted">
          <summary className="cursor-pointer font-medium">
            Verify this round
          </summary>
          <div className="mt-2 flex flex-col gap-1 break-all font-mono">
            <span>Server seed: {result.serverSeed}</span>
            <span>Hash: {result.serverSeedHash}</span>
            <span>Client seed: {result.clientSeed}</span>
            <span>Nonce: {result.nonce}</span>
            <span>Float: {result.float.toFixed(10)}</span>
            <a href="/verify" target="_blank" className="mt-1 text-accent underline">
              Open verifier →
            </a>
          </div>
        </details>
      )}
    </main>
  );
}
