"use client";
import { useState } from "react";

type Pick = "high" | "low";
type Phase = "idle" | "drawing" | "result";
interface CardType { rank: string; suit: string; value: number; }
interface RoundResult {
  nextCard: CardType; nextCardIndex: number;
  win: boolean; payoutCents: number; newBalanceCents: number;
  serverSeed: string; serverSeedHash: string;
  clientSeed: string; nonce: number; float: number;
}

function formatKES(cents: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(cents / 100);
}

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function randomCard() {
  const index = Math.floor(Math.random() * 52);
  return { card: { rank: RANKS[index%13], suit: SUITS[Math.floor(index/13)%4], value: index%13 }, index };
}

function CardFace({ card, faceDown=false }: { card: CardType; faceDown?: boolean }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div className={`flex h-36 w-24 flex-col items-center justify-center rounded-xl border-2 border-zinc-200 bg-white shadow-md text-2xl font-bold ${isRed?"text-red-500":"text-zinc-900"}`}>
      {faceDown ? <span className="text-4xl text-zinc-300">🂠</span> : <><span>{card.rank}</span><span>{card.suit}</span></>}
    </div>
  );
}

export default function CardHighLowPage() {
  const [current, setCurrent] = useState(randomCard);
  const [pick, setPick] = useState<Pick>("high");
  const [amount, setAmount] = useState("100");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setResult(null); setPhase("drawing");
    const clientSeed = crypto.randomUUID();
    const res = await fetch("/api/games/card-high-low", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(amount), pick, currentCardIndex: current.index, clientSeed }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setPhase("idle"); setError(data?.error ?? "Something went wrong."); return; }
    await new Promise(r => setTimeout(r, 600));
    setResult(data); setPhase("result");
  }

  function nextRound() {
    if (!result) return;
    setCurrent({ card: result.nextCard, index: result.nextCardIndex });
    setPhase("idle"); setResult(null); setError(null);
  }

  const inputClass = "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-10">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Card High / Low</h1>
      <p className="mt-1 text-sm text-text-muted">Will the next card be higher or lower?</p>
      <div className="my-8 flex justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-text-muted">Current</p>
          <CardFace card={current.card} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-text-muted">Next</p>
          {phase === "result" && result ? <CardFace card={result.nextCard} /> : <CardFace card={{ rank:"?", suit:"?", value:0 }} faceDown />}
        </div>
      </div>
      {phase === "result" && result && (
        <div className={`mb-6 rounded-2xl p-5 text-center ${result.win?"bg-amber-50":"bg-zinc-100"}`}>
          <p className="text-lg font-bold text-text">{result.win ? "Correct! 🎉" : "Wrong guess."}</p>
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
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={nextRound} className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text hover:bg-accent-hover">Next card</button>
            <button type="button" onClick={() => { setCurrent(randomCard()); setPhase("idle"); setResult(null); }} className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-text-muted hover:text-text">New game</button>
          </div>
        </div>
      )}
      {phase !== "drawing" && phase !== "result" && (
        <form onSubmit={handleBet} className="flex flex-col gap-5" noValidate>
          <div className="flex gap-3">
            {(["high","low"] as Pick[]).map(p => (
              <button key={p} type="button" onClick={() => setPick(p)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition-colors ${pick===p?"border-accent bg-accent text-text":"border-zinc-300 bg-white text-text-muted"}`}>
                {p === "high" ? "⬆ Higher" : "⬇ Lower"}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            Bet amount (KES)
            <input className={inputClass} inputMode="numeric" placeholder="100" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g,""))} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button type="submit" className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover">Draw card</button>
        </form>
      )}
      {phase === "drawing" && <p className="text-center text-sm text-text-muted">Drawing...</p>}
    </main>
  );
}
