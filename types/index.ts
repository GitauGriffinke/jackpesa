export type { TransactionType, BetStatus, RoundStatus } from "@prisma/client";

// Every money amount in the app is an integer number of cents.
export type Cents = number;

export const GAMES = [
  "coin-toss",
  "dice",
  "lucky-wheel",
  "slots",
  "plinko",
  "crash",
  "card-high-low",
  "mini-roulette",
  "scratch-and-win",
  "penalty-shootout",
] as const;

export type GameId = (typeof GAMES)[number];
