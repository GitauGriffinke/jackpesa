import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const PRIZES = [
  { symbol: "💎", multiplier: 10 },
  { symbol: "⭐", multiplier: 5  },
  { symbol: "🔔", multiplier: 3  },
  { symbol: "🍊", multiplier: 2  },
  { symbol: "❌", multiplier: 0  },
];

function generateGrid(float: number) {
  const pool = PRIZES.flatMap(p => [p, p, p]).slice(0, 9);
  for (let i = pool.length - 1; i > 0; i--) {
    const seed = Math.abs((float * 9973 + i * 37) % 1);
    const j = Math.floor(seed * (i + 1)) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 9);
}

function resolveGrid(grid: { symbol: string; multiplier: number }[], amountCents: number) {
  const counts: Record<string, number> = {};
  for (const cell of grid) counts[cell.symbol] = (counts[cell.symbol] ?? 0) + 1;
  for (const prize of PRIZES) {
    if ((counts[prize.symbol] ?? 0) >= 3 && prize.multiplier > 0) {
      return Math.floor(amountCents * prize.multiplier);
    }
  }
  return 0;
}

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
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

  const amountCents = toCents(parsed.data.amountKes);
  const result = await placeBet(
    user.id, "scratch-and-win", amountCents, parsed.data.clientSeed,
    (float) => resolveGrid(generateGrid(float), amountCents),
  );

  return NextResponse.json({
    grid: generateGrid(result.float),
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
