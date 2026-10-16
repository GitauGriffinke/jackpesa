import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  clientSeed: z.string().min(1).max(128),
});

// Weighted reel strip. Higher weight = appears more often.
const SYMBOLS = [
  { symbol: "🍋", weight: 30, name: "lemon" },
  { symbol: "🍊", weight: 25, name: "orange" },
  { symbol: "🍇", weight: 20, name: "grape" },
  { symbol: "🔔", weight: 12, name: "bell" },
  { symbol: "⭐", weight: 8,  name: "star" },
  { symbol: "💎", weight: 5,  name: "diamond" },
];

const TOTAL = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

// Paytable: multiplier for 3 matching symbols.
const PAYTABLE: Record<string, number> = {
  lemon:   1.5,
  orange:  2,
  grape:   3,
  bell:    5,
  star:    10,
  diamond: 25,
};

function pickSymbol(float: number) {
  let cumulative = 0;
  for (const sym of SYMBOLS) {
    cumulative += sym.weight / TOTAL;
    if (float < cumulative) return sym;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// Each reel uses a different slice of the float space via nonce offset.
function reelFloat(baseFloat: number, reel: number): number {
  return ((baseFloat * 1000 + reel * 137) % 1000) / 1000;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const amountCents = toCents(parsed.data.amountKes);

  const result = await placeBet(
    user.id,
    "slots",
    amountCents,
    parsed.data.clientSeed,
    (float) => {
      const r1 = pickSymbol(reelFloat(float, 0));
      const r2 = pickSymbol(reelFloat(float, 1));
      const r3 = pickSymbol(reelFloat(float, 2));
      if (r1.name === r2.name && r2.name === r3.name) {
        return Math.floor(amountCents * PAYTABLE[r1.name]);
      }
      return 0;
    },
  );

  const r1 = pickSymbol(reelFloat(result.float, 0));
  const r2 = pickSymbol(reelFloat(result.float, 1));
  const r3 = pickSymbol(reelFloat(result.float, 2));

  return NextResponse.json({
    reels: [r1.symbol, r2.symbol, r3.symbol],
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
