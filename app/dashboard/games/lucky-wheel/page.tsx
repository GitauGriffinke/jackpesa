"use client";

import { useState, useRef, useEffect } from "react";

type Phase = "idle" | "spinning" | "result";

interface Segment {
  multiplier: number;
  label: string;
  weight: number;
}

interface RoundResult {
  segment: Segment;
  win: boolean;
  payoutCents: number;
  newBalanceCents: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  float: number;
}

const SEGMENTS: Segment[] = [
  { multiplier: 0,   weight: 35, label: "0×" },
  { multiplier: 0.5, weight: 25, label: "0.5×" },
  { multiplier: 1.5, weight: 20, label: "1.5×" },
  { multiplier: 2,   weight: 12, label: "2×" },
  { multiplier: 5,   weight: 6,  label: "5×" },
  { multiplier: 10,  weight: 2,  label: "10×" },
];

const COLORS = ["#EFECE6","#D97706","#EFECE6","#F59E0B","#EFECE6","#1F2937"];
const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

export default function LuckyWheelPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation]);

  function drawWheel(rot: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = rot;
    SEGMENTS.forEach((seg, i) => {
      const sliceAngle = (seg.weight / TOTAL_WEIGHT) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = i === SEGMENTS.length - 1 ? "#FDFBF7" : "#1F2937";
      ctx.font = "bold 14px system-ui";
      ctx.fillText(seg.label, r - 10, 5);
      ctx.restore();

      startAngle += sliceAngle;
    });

    // Centre circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = "#D97706";
    ctx.fill();
  }

  async function handleSpin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setPhase("spinning");

    const clientSeed = crypto.randomUUID();
    const response = await fetch("/api/games/lucky-wheel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), clientSeed }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setPhase("idle");
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    // Animate to the winning segment.
    const seg = data.segment as Segment;
    const segIndex = SEGMENTS.findIndex((s) => s.label === seg.label);
    let cumAngle = 0;
    for (let i = 0; i < segIndex; i++) {
      cumAngle += (SEGMENTS[i].weight / TOTAL_WEIGHT) * 2 * Math.PI;
    }
    const segMid = cumAngle + (SEGMENTS[segIndex].weight / TOTAL_WEIGHT) * Math.PI;
    // Target: pointer at top (−π/2), so we need that segment at the top.
    const target = -Math.PI / 2 - segMid + 6 * 2 * Math.PI; // 6 full spins
    const start = rotation;
    const duration = 3000;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = start + (target - start) * ease;
      setRotation(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setResult(data);
        setPhase("result");
      }
    }
    requestAnimationFrame(animate);
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
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Lucky Wheel</h1>
      <p className="mt-1 text-sm text-text-muted">Spin for multipliers up to 10×.</p>

      {/* Wheel */}
      <div className="relative my-8 flex justify-center">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1 text-2xl">▼</div>
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          className="rounded-full shadow-lg"
        />
      </div>

      {/* Result */}
      {phase === "result" && result && (
        <div className={`mb-6 rounded-2xl p-5 text-center ${result.win ? "bg-amber-50" : "bg-zinc-100"}`}>
          <p className="text-lg font-bold text-text">
            {result.win ? `${result.segment.label} — You won! 🎉` : "0× — You lost."}
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
            className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-text focus-visible:outline-none"
          >
            Spin
          </button>
          {phase === "result" && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-text-muted hover:text-text"
            >
              Spin again
            </button>
          )}
        </form>
      )}
      {phase === "spinning" && (
        <p className="text-center text-sm text-text-muted">Spinning...</p>
      )}
    </main>
  );
}
