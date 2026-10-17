import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatKES } from "@/lib/money";
import type { GameId } from "@/types";

interface GameCard {
  id: GameId;
  label: string;
  description: string;
  emoji: string;
  built: boolean;
}

const GAMES: GameCard[] = [
  { id: "coin-toss", label: "Coin Toss", emoji: "🪙", description: "Heads or tails. 2× payout.", built: true },
  { id: "dice", label: "Dice Roll", emoji: "🎲", description: "Over or under. Up to 5×.", built: true },
  { id: "lucky-wheel", label: "Lucky Wheel", emoji: "🎡", description: "Spin for multipliers up to 10×.", built: true },
  { id: "slots", label: "Slot Machine", emoji: "🎰", description: "3 reels, classic symbols.", built: true },
  { id: "plinko", label: "Plinko", emoji: "📍", description: "Drop the ball, hit a multiplier.", built: true },
  { id: "crash", label: "Crash", emoji: "🚀", description: "Cash out before it crashes.", built: true },
  { id: "card-high-low", label: "Card High / Low", emoji: "🃏", description: "Higher or lower than the last card.", built: true },
  { id: "mini-roulette",    label: "Mini Roulette",     emoji: "🎯", description: "Red, black, green, odd, or even.",    built: false },
  { id: "scratch-and-win",  label: "Scratch & Win",     emoji: "🎟️", description: "Scratch the card, reveal your prize.", built: false },
  { id: "penalty-shootout", label: "Penalty Shootout",  emoji: "⚽", description: "Pick your corner. Beat the keeper.",  built: false },
];

async function BalanceCard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="rounded-2xl bg-card p-6">
      <p className="text-sm text-text-muted">Welcome back, {user.name}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-widest text-text-muted">
        Balance
      </p>
      <p className="mt-1 text-4xl font-bold text-accent">
        {formatKES(user.balanceCents)}
      </p>
      <Link
        href="/dashboard/wallet"
        className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-accent-hover"
      >
        Deposit / Withdraw
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Suspense
        fallback={
          <div className="rounded-2xl bg-card p-6">
            <p className="text-sm text-text-muted">Loading balance...</p>
          </div>
        }
      >
        <BalanceCard />
      </Suspense>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-text">Games</h2>
        <p className="mt-1 text-sm text-text-muted">
          Pick a game and place your bet.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {GAMES.map((game) => (
            <li key={game.id}>
              {game.built ? (
                <Link
                  href={`/dashboard/games/${game.id}`}
                  className="flex flex-col gap-2 rounded-2xl bg-card p-5 transition-shadow hover:shadow-md active:scale-95"
                >
                  <span className="text-3xl">{game.emoji}</span>
                  <span className="font-semibold text-text">{game.label}</span>
                  <span className="text-xs text-text-muted">
                    {game.description}
                  </span>
                </Link>
              ) : (
                <div className="flex flex-col gap-2 rounded-2xl bg-card p-5 opacity-60 cursor-not-allowed">
                  <span className="text-3xl">{game.emoji}</span>
                  <span className="font-semibold text-text">{game.label}</span>
                  <span className="text-xs text-text-muted">
                    {game.description}
                  </span>
                  <span className="mt-1 text-xs font-medium text-accent">
                    Coming soon
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
