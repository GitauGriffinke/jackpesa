import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  risk: z.enum(["low", "medium", "high"]),
  clientSeed: z.string().min(1).max(128),
});

// 8-row Plinko. Ball goes left or right at each row.
// The slot index (0-8) maps to a multiplier based on risk.
const MULTIPLIERS: Record<string, number[]> = {
  low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13],
  high:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29],
};

export function resolvePlinko(float: number, risk: string): { slot: number; multiplier: number; path: boolean[] } {
  const rows = 8;
  // Use successive bits of the float to determine left(false)/right(true) at each row.
  const path: boolean[] = [];
  let value = float;
  for (let i = 0; i < rows; i++) {
    value = ((value * 1000 + i * 37) % 1000) / 1000;
    path.push(value >= 0.5);
  }
  const slot = path.filter(Boolean).length;
  const multiplier = MULTIPLIERS[risk][slot];
  return { slot, multiplier, path };
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

  const { amountKes, risk, clientSeed } = parsed.data;
  const amountCents = toCents(amountKes);

  const result = await placeBet(
    user.id,
    "plinko",
    amountCents,
    clientSeed,
    (float) => {
      const { multiplier } = resolvePlinko(float, risk);
      return Math.floor(amountCents * multiplier);
    },
  );

  const { slot, multiplier, path } = resolvePlinko(result.float, risk);

  return NextResponse.json({
    slot,
    multiplier,
    path,
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
