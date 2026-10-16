"use client";

import { useState, useEffect, useRef } from "react";

type Risk = "low" | "medium" | "high";
type Phase = "idle" | "dropping" | "result";

interface RoundResult {
  slot: number;
  multiplier: number;
  path: boolean[];
  win: boolean;
  payoutCents: number;
  newBalanceCents: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  float: number;
}

const MULTIPLIERS: Record<Risk, number[]> = {
  low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13],
  high:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29],
};

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

const ROWS = 8;
const COLS = ROWS + 1; // 9 slots at the bottom

export default function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [risk, setRisk] = useState<Risk>("low");
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);

  const W = 300;
  const H = 320;
  const pegR = 5;
  const slotH = 32;
  const boardH = H - slotH;

  function pegX(row: number, col: number) {
    const pegsInRow = row + 2;
    const spacing = W / (pegsInRow + 1);
    return spacing * (col + 1);
  }
  function pegY(row: number) {
    return ((row + 1) / (ROWS + 1)) * boardH;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Pegs
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= row + 1; col++) {
        ctx.beginPath();
        ctx.arc(pegX(row, col), pegY(row), pegR, 0, 2 * Math.PI);
        ctx.fillStyle = "#D97706";
        ctx.fill();
      }
    }

    // Slots
    const mults = MULTIPLIERS[risk];
    const slotW = W / COLS;
    mults.forEach((mult, i) => {
      const x = i * slotW;
      const y = H - slotH;
      const highlight = result && result.slot === i;
      ctx.fillStyle = highlight ? "#D97706" : "#EFECE6";
      ctx.fillRect(x + 2, y + 2, slotW - 4, slotH - 4);
      ctx.fillStyle = highlight ? "#1F2937" : "#4B5563";
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${mult}×`, x + slotW / 2, y + slotH / 2 + 4);
    });

    // Ball
    if (ballPos) {
      ctx.beginPath();
      ctx.arc(ballPos.x, ballPos.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "#1F2937";
      ctx.fill();
    }
  }, [risk, result, ballPos]);

  async function handleDrop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setBallPos(null);
    setPhase("dropping");

    const clientSeed = crypto.randomUUID();
    const response = await fetch("/api/games/plinko", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), risk, clientSeed }),
    });

    const data: RoundResult = await response.json().catch(() => null);
    if (!response.ok) {
      setPhase("idle");
      setError((data as unknown as { error: string })?.error ?? "Something went wrong.");
      return;
    }

    // Animate ball along path
    const startX = W / 2;
    const startY = 10;
    setBallPos({ x: startX, y: startY });

    let col = 0;
    for (let row = 0; row < ROWS; row++) {
      const goRight = data.path[row];
      if (goRight) col++;
      const targetX = pegX(row, col) + (goRight ? pegR * 2 : -pegR * 2);
      const targetY = pegY(row);
      await animateBall(
        { x: row === 0 ? startX : pegX(row - 1, goRight ? col - 1 : col), y: row === 0 ? startY : pegY(row - 1) },
        { x: targetX, y: targetY },
        180,
      );
    }
    // Drop to slot
    const slotW = W / COLS;
    await animateBall(
      { x: pegX(ROWS - 1, col), y: pegY(ROWS - 1) },
      { x: data.slot * slotW + slotW / 2, y: H - slotH / 2 },
      200,
    );

    setResult(data);
    setPhase("result");
  }

  function animateBall(
    from: { x: number; y: number },
    to: { x: number; y: number },
    duration: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now: number) {
        const p = Math.min((now - start) / duration, 1);
        setBallPos({ x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p });
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setBallPos(null);
    setError(null);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Plinko</h1>
      <p className="mt-1 text-sm text-text-muted">Drop the ball. Watch it bounce to your multiplier.</p>

      <canvas ref={canvasRef} width={W} height={H} className="my-6 w-full rounded-2xl bg-surface shadow-md" />

      {phase === "result" && result && (
        <div className={`mb-6 rounded-2xl p-5 text-center ${result.win ? "bg-amber-50" : "bg-zinc-100"}`}>
          <p className="text-lg font-bold text-text">
            {result.multiplier}× — {result.win ? "You won! 🎉" : "You lost."}
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

      {phase !== "dropping" && (
        <form onSubmit={handleDrop} className="flex flex-col gap-5" noValidate>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as Risk[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRisk(r); setResult(null); setBallPos(null); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                  risk === r ? "border-accent bg-accent text-text" : "border-zinc-300 bg-white text-text-muted"
                }`}
              >
                {r}
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
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover"
          >
            Drop ball
          </button>
          {phase === "result" && (
            <button type="button" onClick={reset} className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text">
              Drop again
            </button>
          )}
        </form>
      )}
      {phase === "dropping" && (
        <p className="text-center text-sm text-text-muted">Ball dropping...</p>
      )}
    </main>
  );
}
