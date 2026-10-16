import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  pick: z.enum(["heads", "tails"]),
  clientSeed: z.string().min(1).max(128),
});

// House edge 1%. Winning pays 1.98×.
const PAYOUT_MULTIPLIER = 1.98;

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

  const { amountKes, pick, clientSeed } = parsed.data;
  const amountCents = toCents(amountKes);

  // float < 0.5 = heads, float >= 0.5 = tails
  const result = await placeBet(
    user.id,
    "coin-toss",
    amountCents,
    clientSeed,
    (float) => {
      const outcome = float < 0.5 ? "heads" : "tails";
      return outcome === pick
        ? Math.floor(amountCents * PAYOUT_MULTIPLIER)
        : 0;
    },
  );

  const outcome = result.float < 0.5 ? "heads" : "tails";

  return NextResponse.json({
    outcome,
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
