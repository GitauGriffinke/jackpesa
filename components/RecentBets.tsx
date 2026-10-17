"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Bet {
  id: string;
  game: string;
  userName: string;
  amountCents: number;
  payoutCents: number;
  status: string;
  multiplier: string;
}

const GAME_EMOJI: Record<string, string> = {
  "coin-toss": "🪙", "dice": "🎲", "lucky-wheel": "🎡",
  "slots": "🎰", "plinko": "📍", "crash": "🚀",
  "card-high-low": "🃏", "mini-roulette": "🎯",
  "scratch-and-win": "🎟️", "penalty-shootout": "⚽",
};

function formatKES(cents: number) {
  return "KES " + (cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 0 });
}

export default function RecentBets() {
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/bets/recent");
        if (res.ok) setBets(await res.json());
      } catch { /* ignore */ }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  if (bets.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-win animate-pulse" />
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Live bets</p>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        <AnimatePresence initial={false}>
          {bets.slice(0, 8).map(bet => (
            <motion.div
              key={bet.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{GAME_EMOJI[bet.game] ?? "🎮"}</span>
                <div>
                  <p className="font-medium text-text leading-none">{bet.userName}</p>
                  <p className="text-xs text-text-muted capitalize mt-0.5">{bet.game.replace(/-/g, " ")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-text-muted">{formatKES(bet.amountCents)}</p>
                {bet.status === "WON" ? (
                  <p className="font-bold text-win text-sm">{bet.multiplier}× 🎉</p>
                ) : (
                  <p className="text-xs text-text-muted">Lost</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
