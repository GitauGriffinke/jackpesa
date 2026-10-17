import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const SUITS = ["♠","♥","♦","♣"] as const;
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"] as const;
type Rank = typeof RANKS[number];
type Suit = typeof SUITS[number];
interface Card { rank: Rank; suit: Suit; value: number; }

function indexToCard(index: number): Card {
  return {
    rank: RANKS[index % 13],
    suit: SUITS[Math.floor(index / 13) % 4],
    value: index % 13,
  };
}

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  pick: z.enum(["high", "low"]),
  currentCardIndex: z.number().int().min(0).max(51),
  clientSeed: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { amountKes, pick, currentCardIndex, clientSeed } = parsed.data;
  const amountCents = toCents(amountKes);
  const currentCard = indexToCard(currentCardIndex);

  const result = await placeBet(
    user.id, "card-high-low", amountCents, clientSeed,
    (float) => {
      const nextCard = indexToCard(Math.floor(float * 52));
      const win = pick === "high"
        ? nextCard.value > currentCard.value
        : nextCard.value < currentCard.value;
      return win ? Math.floor(amountCents * 1.9) : 0;
    },
  );

  const nextIndex = Math.floor(result.float * 52);
  const nextCard = indexToCard(nextIndex);

  return NextResponse.json({
    nextCard, nextCardIndex: nextIndex,
    win: result.payoutCents > 0,
    payoutCents: result.payoutCents,
    newBalanceCents: result.newBalanceCents,
    serverSeed: result.round.serverSeed,
    serverSeedHash: result.round.serverSeedHash,
    clientSeed: result.round.clientSeed,
    nonce: result.round.nonce,
    float: result.float,
  });
}
