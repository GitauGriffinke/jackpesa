import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { placeBet } from "@/lib/bet";
import { toCents } from "@/lib/money";

const Schema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
  clientSeed: z.string().min(1).max(128),
});

// Segments: [multiplier, weight]. Weights sum to 100.
// House edge ~1%.
const SEGMENTS: { multiplier: number; weight: number; label: string }[] = [
  { multiplier: 0,    weight: 35, label: "0×" },
  { multiplier: 0.5,  weight: 25, label: "0.5×" },
  { multiplier: 1.5,  weight: 20, label: "1.5×" },
  { multiplier: 2,    weight: 12, label: "2×" },
  { multiplier: 5,    weight: 6,  label: "5×" },
  { multiplier: 10,   weight: 2,  label: "10×" },
];

export function resolveWheel(float: number): typeof SEGMENTS[number] {
  let cumulative = 0;
  const total = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  for (const seg of SEGMENTS) {
    cumulative += seg.weight / total;
    if (float < cumulative) return seg;
  }
  return SEGMENTS[SEGMENTS.length - 1];
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
    "lucky-wheel",
    amountCents,
    parsed.data.clientSeed,
    (float) => {
      const seg = resolveWheel(float);
      return Math.floor(amountCents * seg.multiplier);
    },
  );

  const segment = resolveWheel(result.float);

  return NextResponse.json({
    segment,
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
