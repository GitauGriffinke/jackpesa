import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatKES } from "@/lib/money";
import RecentBets from "@/components/RecentBets";

const ORIGINAL_GAMES = [
  { id: "crash",           label: "Crash",          emoji: "🚀", gradient: "from-orange-950 to-red-900",    desc: "Cash out before crash",     hot: true  },
  { id: "plinko",          label: "Plinko",         emoji: "📍", gradient: "from-purple-950 to-purple-900", desc: "Drop the ball",             hot: false },
  { id: "dice",            label: "Dice",           emoji: "🎲", gradient: "from-blue-950 to-blue-900",     desc: "Over or under",             hot: false },
  { id: "mini-roulette",   label: "Roulette",       emoji: "🎯", gradient: "from-green-950 to-green-900",   desc: "Red, black, green",         hot: false },
  { id: "lucky-wheel",     label: "Wheel",          emoji: "🎡", gradient: "from-yellow-950 to-amber-900",  desc: "Spin for up to 10×",        hot: false },
];

const MORE_GAMES = [
  { id: "slots",            label: "Slots",          emoji: "🎰", gradient: "from-pink-950 to-rose-900",     desc: "Match 3. 25× max"           },
  { id: "coin-toss",        label: "Coin Toss",      emoji: "🪙", gradient: "from-zinc-800 to-zinc-900",     desc: "Heads or tails. 1.98×"      },
  { id: "card-high-low",    label: "Cards",          emoji: "🃏", gradient: "from-indigo-950 to-indigo-900", desc: "Higher or lower. 1.9×"      },
  { id: "scratch-and-win",  label: "Scratch",        emoji: "🎟️", gradient: "from-teal-950 to-teal-900",    desc: "Match 3 symbols. 10×"       },
  { id: "penalty-shootout", label: "Penalty",        emoji: "⚽", gradient: "from-emerald-950 to-emerald-900", desc: "Beat the keeper. 1.47×" },
];

async function HeroBalance() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text-muted">Welcome back,</p>
        <p className="text-xl font-bold text-text">{user.name.split(" ")[0]} 👋</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-text-muted uppercase tracking-widest">Balance</p>
        <p className="text-2xl font-bold text-accent">{formatKES(user.balanceCents)}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">

      {/* Demo banner */}
      <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-2 text-center text-xs font-medium text-accent">
        DEMO — No real money. Sandbox payments only.
      </div>

      {/* Balance row */}
      <div className="rounded-2xl border border-border bg-card px-6 py-4">
        <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-surface" />}>
          <HeroBalance />
        </Suspense>
        <div className="mt-4 flex gap-2">
          <Link href="/dashboard/wallet" className="flex-1 rounded-lg bg-accent py-2.5 text-center text-sm font-bold text-page hover:bg-accent-hover transition-colors">
            + Deposit
          </Link>
          <Link href="/dashboard/wallet" className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-medium text-text-muted hover:text-text transition-colors">
            Withdraw
          </Link>
          <Link href="/dashboard/history" className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-center text-sm font-medium text-text-muted hover:text-text transition-colors">
            History
          </Link>
        </div>
      </div>

      {/* Featured: Crash */}
      <Link
        href="/dashboard/games/crash"
        className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-orange-800/40 bg-gradient-to-r from-orange-950 via-red-950 to-card p-6 transition-all hover:border-orange-600/60 hover:shadow-xl hover:shadow-orange-900/20"
      >
        <div className="z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-400 mb-3">
            🔥 MOST POPULAR
          </div>
          <h2 className="text-2xl font-bold text-text">Crash</h2>
          <p className="mt-1 text-sm text-text-muted">Watch the multiplier rise. Cash out before it crashes.</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-page group-hover:bg-accent-hover transition-colors">
            Play now →
          </div>
        </div>
        <div className="text-8xl opacity-80 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2">
          🚀
        </div>
      </Link>

      {/* Original games */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">Original Games</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ORIGINAL_GAMES.filter(g => g.id !== "crash").map(game => (
            <Link
              key={game.id}
              href={`/dashboard/games/${game.id}`}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${game.gradient} border border-white/5 p-4 transition-all hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5`}
            >
              {game.hot && (
                <span className="absolute top-2 right-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">HOT</span>
              )}
              <div className="text-3xl mb-2 transition-transform group-hover:scale-110">{game.emoji}</div>
              <p className="text-sm font-bold text-white">{game.label}</p>
              <p className="text-xs text-white/50 mt-0.5">{game.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* More games */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm">🎮</span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">More Games</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MORE_GAMES.map(game => (
            <Link
              key={game.id}
              href={`/dashboard/games/${game.id}`}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${game.gradient} border border-white/5 p-4 transition-all hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div className="text-3xl mb-2 transition-transform group-hover:scale-110">{game.emoji}</div>
              <p className="text-sm font-bold text-white">{game.label}</p>
              <p className="text-xs text-white/50 mt-0.5">{game.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Live bets feed */}
      <RecentBets />

    </main>
  );
}
