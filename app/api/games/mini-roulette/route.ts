import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

// 13 slots: 0 (green), 1-6 (red), 7-12 (black)
const SLOTS = 13;
const RED = new Set([1,2,3,4,5,6]);
const BLACK = new Set([7,8,9,10,11,12]);

const BET_TYPES = ["red","black","green","odd","even"] as const;
type BetType = typeof BET_TYPES[number];

const PAYOUTS: Record<BetType, number> = {
  red: 2, black: 2, green: 13, odd: 2, even: 2,
};

function isWin(slot: number, betType: BetType): boolean {
  switch (betType) {
    case "red":   return RED.has(slot);
    case "black": return BLACK.has(slot);
    case "green": return slot === 0;
    case "odd":   return slot !== 0 && slot % 2 !== 0;
    case "even":  return slot !== 0 && slot % 2 === 0;
  }
}

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  betType: z.enum(BET_TYPES),
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

  const { amountKes, betType, clientSeed } = parsed.data;
  const amountCents = toCents(amountKes);

  const result = await placeBet(
    user.id, "mini-roulette", amountCents, clientSeed,
    (float) => {
      const slot = Math.floor(float * SLOTS);
      return isWin(slot, betType)
        ? Math.floor(amountCents * PAYOUTS[betType])
        : 0;
    },
  );

  const slot = Math.floor(result.float * SLOTS);

  return NextResponse.json({
    slot,
    color: slot === 0 ? "green" : RED.has(slot) ? "red" : "black",
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
