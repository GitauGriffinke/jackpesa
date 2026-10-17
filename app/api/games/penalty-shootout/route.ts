import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const DIRECTIONS = ["left", "center", "right"] as const;
type Direction = typeof DIRECTIONS[number];

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  direction: z.enum(DIRECTIONS),
  clientSeed: z.string().min(1).max(128),
});

// Keeper dives to one of 3 directions. Player wins if keeper goes elsewhere.
// Win chance: 2/3. Payout: 1.47× (house edge ~2%).
const PAYOUT_MULTIPLIER = 1.47;

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

  const { amountKes, direction, clientSeed } = parsed.data;
  const amountCents = toCents(amountKes);

  const result = await placeBet(
    user.id, "penalty-shootout", amountCents, clientSeed,
    (float) => {
      const keeperIndex = Math.floor(float * 3);
      const keeper = DIRECTIONS[keeperIndex];
      return keeper !== direction ? Math.floor(amountCents * PAYOUT_MULTIPLIER) : 0;
    },
  );

  const keeperIndex = Math.floor(result.float * 3);
  const keeper = DIRECTIONS[keeperIndex];

  return NextResponse.json({
    keeper,
    playerDirection: direction,
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
