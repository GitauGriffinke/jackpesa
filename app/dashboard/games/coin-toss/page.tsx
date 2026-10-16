"use client";

import { useState } from "react";

type Pick = "heads" | "tails";
type Phase = "idle" | "flipping" | "result";

interface RoundResult {
  outcome: Pick;
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

export default function CoinTossPage() {
  const [pick, setPick] = useState<Pick>("heads");
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setPhase("flipping");

    const clientSeed = crypto.randomUUID();

    const response = await fetch("/api/games/coin-toss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountKes: Number(amount),
        pick,
        clientSeed,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setPhase("idle");
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    // Brief flip animation delay.
    await new Promise((r) => setTimeout(r, 900));
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
      <h1 className="mt-4 text-2xl font-bold text-text">Coin Toss</h1>
      <p className="mt-1 text-sm text-text-muted">
        Pick heads or tails. Win pays 1.98×.
      </p>

      {/* Coin display */}
      <div className="my-8 flex justify-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl shadow-md transition-all duration-700 ${
            phase === "flipping"
              ? "animate-spin bg-accent"
              : phase === "result" && result
              ? result.outcome === "heads"
                ? "bg-amber-400"
                : "bg-zinc-300"
              : "bg-card"
          }`}
        >
          {phase === "flipping"
            ? "🪙"
            : phase === "result" && result
            ? result.outcome === "heads"
              ? "👑"
              : "🦅"
            : "🪙"}
        </div>
      </div>

      {/* Result message */}
      {phase === "result" && result && (
        <div
          className={`mb-6 rounded-2xl p-5 text-center ${
            result.win ? "bg-amber-50" : "bg-zinc-100"
          }`}
        >
          <p className="text-lg font-bold text-text">
            {result.win ? "You won! 🎉" : "You lost."}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Outcome: <span className="font-medium capitalize">{result.outcome}</span>
          </p>
          {result.win && (
            <p className="mt-1 text-sm font-semibold text-accent">
              +{formatKES(result.payoutCents)}
            </p>
          )}
          <p className="mt-2 text-sm text-text-muted">
            New balance:{" "}
            <span className="font-medium text-text">
              {formatKES(result.newBalanceCents)}
            </span>
          </p>

          {/* Provably fair proof */}
          <details className="mt-4 text-left text-xs text-text-muted">
            <summary className="cursor-pointer font-medium">
              Verify this round
            </summary>
            <div className="mt-2 flex flex-col gap-1 break-all font-mono">
              <span>Server seed: {result.serverSeed}</span>
              <span>Hash: {result.serverSeedHash}</span>
              <span>Client seed: {result.clientSeed}</span>
              <span>Nonce: {result.nonce}</span>
              <span>Float: {result.float.toFixed(10)}</span>
              <a
                href={`/verify`}
                target="_blank"
                className="mt-1 text-accent underline"
              >
                Open verifier →
              </a>
            </div>
          </details>
        </div>
      )}

      {/* Bet form */}
      {phase !== "flipping" && (
        <form onSubmit={handleBet} className="flex flex-col gap-5" noValidate>
          <div className="flex gap-3">
            {(["heads", "tails"] as Pick[]).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setPick(side)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition-colors ${
                  pick === side
                    ? "border-accent bg-accent text-text"
                    : "border-zinc-300 bg-white text-text-muted"
                }`}
              >
                {side === "heads" ? "👑 Heads" : "🦅 Tails"}
              </button>
            ))}
          </div>

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
            Flip coin
          </button>

          {phase === "result" && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text"
            >
              Play again
            </button>
          )}
        </form>
      )}

      {phase === "flipping" && (
        <p className="text-center text-sm text-text-muted">Flipping...</p>
      )}
    </main>
  );
}
