"use client";

import { useState, useEffect, useRef } from "react";

type Status = "WAITING" | "RUNNING" | "CRASHED";

interface CrashState {
  roundId: string;
  status: Status;
  multiplier: number;
  serverSeedHash: string;
  serverSeed: string | null;
  countdown: number;
}

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

export default function CrashPage() {
  const [gameState, setGameState] = useState<CrashState | null>(null);
  const [amount, setAmount] = useState("100");
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutResult, setCashoutResult] = useState<{ payoutCents: number; multiplier: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRoundId, setLastRoundId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/games/crash/state");
        if (!res.ok) return;
        const data: CrashState = await res.json();
        setGameState((prev) => {
          // Reset bet state when a new round starts.
          if (prev && prev.roundId !== data.roundId) {
            setBetPlaced(false);
            setCashedOut(false);
            setCashoutResult(null);
            setError(null);
            setLastRoundId(prev.roundId);
          }
          return data;
        });
      } catch {
        // Network error — keep showing the last known state.
      }
    }
    poll();
    intervalRef.current = setInterval(poll, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function handleBet() {
    setError(null);
    const res = await fetch("/api/games/crash/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setError(data?.error ?? "Bet failed."); return; }
    setBetPlaced(true);
  }

  async function handleCashout() {
    setError(null);
    const res = await fetch("/api/games/crash/cashout", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setError(data?.error ?? "Cashout failed."); return; }
    setCashedOut(true);
    setCashoutResult({ payoutCents: data.payoutCents, multiplier: data.multiplier });
  }

  const status = gameState?.status ?? "WAITING";
  const multiplier = gameState?.multiplier ?? 1.0;

  const multiplierColor =
    status === "CRASHED" ? "text-danger" :
    multiplier >= 2 ? "text-accent" : "text-text";

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Crash</h1>
      <p className="mt-1 text-sm text-text-muted">Cash out before the rocket crashes.</p>

      {/* Multiplier display */}
      <div className="my-8 flex flex-col items-center justify-center rounded-2xl bg-card py-12">
        {status === "WAITING" ? (
          <>
            <p className="text-5xl">🚀</p>
            <p className="mt-4 text-xl font-bold text-text">
              Starting in {gameState?.countdown ?? "…"}s
            </p>
            <p className="mt-1 text-sm text-text-muted">Place your bet now</p>
          </>
        ) : status === "RUNNING" ? (
          <>
            <p className="text-5xl">🚀</p>
            <p className={`mt-4 text-6xl font-bold tabular-nums ${multiplierColor}`}>
              {multiplier.toFixed(2)}×
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl">💥</p>
            <p className="mt-4 text-4xl font-bold text-danger">
              CRASHED @ {multiplier.toFixed(2)}×
            </p>
            {gameState?.serverSeed && (
              <details className="mt-4 w-full px-4 text-left text-xs text-text-muted">
                <summary className="cursor-pointer font-medium">Verify this round</summary>
                <div className="mt-2 flex flex-col gap-1 break-all font-mono">
                  <span>Server seed: {gameState.serverSeed}</span>
                  <span>Hash: {gameState.serverSeedHash}</span>
                  <a href="/verify" target="_blank" className="mt-1 text-accent underline">Open verifier →</a>
                </div>
              </details>
            )}
          </>
        )}
      </div>

      {/* Cashout result */}
      {cashedOut && cashoutResult && (
        <div className="mb-6 rounded-2xl bg-amber-50 p-5 text-center">
          <p className="text-lg font-bold text-text">
            Cashed out at {cashoutResult.multiplier.toFixed(2)}× 🎉
          </p>
          <p className="mt-1 text-sm font-semibold text-accent">
            +{formatKES(cashoutResult.payoutCents)}
          </p>
        </div>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

      {/* Controls */}
      {!betPlaced && status === "WAITING" && (
        <div className="flex flex-col gap-4">
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
          <button
            type="button"
            onClick={handleBet}
            className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover"
          >
            Place bet
          </button>
        </div>
      )}

      {betPlaced && !cashedOut && status === "RUNNING" && (
        <button
          type="button"
          onClick={handleCashout}
          className="w-full rounded-lg bg-accent px-4 py-4 text-lg font-bold text-text transition-colors hover:bg-accent-hover"
        >
          CASH OUT @ {multiplier.toFixed(2)}×
        </button>
      )}

      {betPlaced && status === "WAITING" && !cashedOut && (
        <div className="rounded-xl bg-card p-4 text-center text-sm text-text-muted">
          Bet placed. Waiting for round to start…
        </div>
      )}

      {betPlaced && status === "CRASHED" && !cashedOut && (
        <div className="rounded-xl bg-zinc-100 p-4 text-center">
          <p className="font-semibold text-danger">You didn't cash out in time.</p>
        </div>
      )}
    </main>
  );
}
