import Link from "next/link";
import type { GameId } from "@/types";

interface GameCard {
  id: GameId;
  label: string;
  description: string;
  built: boolean;
}

const GAMES: GameCard[] = [
  { id: "coin-toss",        label: "Coin Toss",        description: "Heads or tails. 2× payout.",              built: false },
  { id: "dice",             label: "Dice Roll",         description: "Over or under. Up to 5×.",                built: false },
  { id: "lucky-wheel",      label: "Lucky Wheel",       description: "Spin for multipliers up to 10×.",         built: false },
  { id: "slots",            label: "Slot Machine",      description: "3 reels, classic symbols.",               built: false },
  { id: "plinko",           label: "Plinko",            description: "Drop the ball, hit a multiplier.",        built: false },
  { id: "crash",            label: "Crash",             description: "Cash out before it crashes.",             built: false },
  { id: "card-high-low",    label: "Card High / Low",   description: "Higher or lower than the last card.",     built: false },
  { id: "mini-roulette",    label: "Mini Roulette",     description: "Red, black, green, odd, or even.",        built: false },
  { id: "scratch-and-win",  label: "Scratch & Win",     description: "Scratch the card, reveal your prize.",    built: false },
  { id: "penalty-shootout", label: "Penalty Shootout",  description: "Pick your corner. Beat the keeper.",      built: false },
];

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-text">Games</h1>
      <p className="mt-1 text-sm text-text-muted">Choose a game to play.</p>

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {GAMES.map((game) => (
          <li key={game.id}>
            {game.built ? (
              <Link
                href={`/dashboard/games/${game.id}`}
                className="flex flex-col gap-2 rounded-2xl bg-card p-5 transition-shadow hover:shadow-md"
              >
                <span className="font-semibold text-text">{game.label}</span>
                <span className="text-xs text-text-muted">{game.description}</span>
              </Link>
            ) : (
              <div className="flex flex-col gap-2 rounded-2xl bg-card p-5 opacity-60">
                <span className="font-semibold text-text">{game.label}</span>
                <span className="text-xs text-text-muted">{game.description}</span>
                <span className="mt-1 text-xs font-medium text-accent">Coming soon</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
