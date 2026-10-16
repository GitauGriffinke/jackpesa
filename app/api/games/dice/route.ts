import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  target: z.number().int().min(2).max(98),
  over: z.boolean(),
  clientSeed: z.string().min(1).max(128),
});

// House edge 1%.
function payout(amountCents: number, winChance: number): number {
  return Math.floor((amountCents * 0.99) / winChance);
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

  const { amountKes, target, over, clientSeed } = parsed.data;
  const amountCents = toCents(amountKes);

  // Roll is 0–99.99. Convert float to that range.
  const result = await placeBet(
    user.id,
    "dice",
    amountCents,
    clientSeed,
    (float) => {
      const roll = parseFloat((float * 100).toFixed(2));
      const win = over ? roll > target : roll < target;
      if (!win) return 0;
      const winChance = over ? (99 - target) / 100 : target / 100;
      return payout(amountCents, winChance);
    },
  );

  const roll = parseFloat((result.float * 100).toFixed(2));

  return NextResponse.json({
    roll,
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
