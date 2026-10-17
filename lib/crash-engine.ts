import { prisma } from "@/lib/prisma";
import { generateServerSeed, hashServerSeed, outcomeFloat } from "@/lib/fair";
import { moveMoney } from "@/lib/wallet";

export type CrashStatus = "WAITING" | "RUNNING" | "CRASHED";

export interface CrashState {
  roundId: string;
  status: CrashStatus;
  multiplier: number;
  crashPoint: number;
  serverSeedHash: string;
  serverSeed: string | null;
  countdown: number;
  startedAt: string | null;
}

const WAITING_MS = 7_000;

function crashPoint(float: number): number {
  return Math.max(1.0, 0.99 / (1 - float));
}

function multiplierAt(startedAt: Date): number {
  const elapsed = (Date.now() - startedAt.getTime()) / 1000;
  return Math.max(1.0, parseFloat(Math.pow(Math.E, 0.1 * elapsed).toFixed(2)));
}

// Derive the current round state from the database row alone.
// No in-memory state is needed.
export async function getCurrentState(): Promise<CrashState | null> {
  const round = await prisma.round.findFirst({
    where: { game: "crash", status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  if (!round) return null;

  const outcome = round.outcome as { crashPoint: number; startedAt?: string } | null;
  const cp = outcome?.crashPoint ?? 2;
  const startedAt = outcome?.startedAt ? new Date(outcome.startedAt) : null;
  const createdAt = round.createdAt;

  const elapsed = Date.now() - createdAt.getTime();

  if (!startedAt && elapsed < WAITING_MS) {
    // Still in WAITING phase.
    return {
      roundId: round.id,
      status: "WAITING",
      multiplier: 1.0,
      crashPoint: cp,
      serverSeedHash: round.serverSeedHash,
      serverSeed: null,
      countdown: Math.ceil((WAITING_MS - elapsed) / 1000),
      startedAt: null,
    };
  }

  if (!startedAt) {
    // Transition to RUNNING: record startedAt in DB.
    const now = new Date();
    await prisma.round.update({
      where: { id: round.id },
      data: { outcome: { crashPoint: cp, startedAt: now.toISOString() } },
    });
    return {
      roundId: round.id,
      status: "RUNNING",
      multiplier: 1.0,
      crashPoint: cp,
      serverSeedHash: round.serverSeedHash,
      serverSeed: null,
      countdown: 0,
      startedAt: now.toISOString(),
    };
  }

  const mult = multiplierAt(startedAt);

  if (mult >= cp) {
    // Crashed. Settle if not already done.
    await settleCrashedRound(round.id, round.serverSeed, cp);
    return {
      roundId: round.id,
      status: "CRASHED",
      multiplier: parseFloat(cp.toFixed(2)),
      crashPoint: cp,
      serverSeedHash: round.serverSeedHash,
      serverSeed: round.serverSeed,
      countdown: 0,
      startedAt: startedAt.toISOString(),
    };
  }

  return {
    roundId: round.id,
    status: "RUNNING",
    multiplier: mult,
    crashPoint: cp,
    serverSeedHash: round.serverSeedHash,
    serverSeed: null,
    countdown: 0,
    startedAt: startedAt.toISOString(),
  };
}

async function settleCrashedRound(roundId: string, serverSeed: string, cp: number) {
  // Idempotent: only settle OPEN rounds.
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.status === "SETTLED") return;

  await prisma.round.update({
    where: { id: roundId },
    data: { status: "SETTLED", outcome: { crashPoint: cp, settled: true } },
  });

  // Mark all unsettled bets as LOST.
  await prisma.bet.updateMany({
    where: { roundId, status: "PENDING" },
    data: { status: "LOST", payoutCents: 0 },
  });
}

export async function ensureOpenRound(): Promise<void> {
  const existing = await prisma.round.findFirst({
    where: { game: "crash", status: "OPEN" },
  });
  if (existing) return;

  // Check if the last round crashed recently (3s cooldown).
  const last = await prisma.round.findFirst({
    where: { game: "crash", status: "SETTLED" },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const outcome = last.outcome as { settled?: boolean; startedAt?: string } | null;
    if (outcome?.startedAt) {
      const crashedAt = new Date(outcome.startedAt).getTime();
      if (Date.now() - crashedAt < 3_000) return; // Still in cooldown.
    }
  }

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const float = outcomeFloat(serverSeed, "house", Date.now());
  const cp = crashPoint(float);

  await prisma.round.create({
    data: {
      game: "crash",
      serverSeed,
      serverSeedHash,
      clientSeed: "house",
      nonce: Date.now(),
      outcome: { crashPoint: cp },
      status: "OPEN",
    },
  });
}

export async function placeCrashBet(
  userId: string,
  amountCents: number,
): Promise<{ ok: boolean; error?: string }> {
  const state = await getCurrentState();
  if (!state || state.status !== "WAITING") {
    return { ok: false, error: "Betting is closed. Wait for the next round." };
  }

  const existing = await prisma.bet.findFirst({
    where: { userId, roundId: state.roundId, status: "PENDING" },
  });
  if (existing) return { ok: false, error: "You already have a bet in this round." };

  try {
    await moveMoney({ userId, type: "BET", deltaCents: -amountCents, refId: state.roundId });
    await prisma.bet.create({
      data: { userId, roundId: state.roundId, game: "crash", amountCents, payoutCents: 0, status: "PENDING" },
    });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Bet failed." };
  }
}

export async function cashOut(
  userId: string,
): Promise<{ ok: boolean; payoutCents?: number; multiplier?: number; error?: string }> {
  const state = await getCurrentState();
  if (!state || state.status !== "RUNNING") {
    return { ok: false, error: "Not in a running round." };
  }

  const bet = await prisma.bet.findFirst({
    where: { userId, roundId: state.roundId, status: "PENDING" },
  });
  if (!bet) return { ok: false, error: "No active bet found." };

  const mult = state.multiplier;
  const payoutCents = Math.floor(bet.amountCents * mult);

  await prisma.bet.update({
    where: { id: bet.id },
    data: { status: "WON", payoutCents },
  });

  await moveMoney({ userId, type: "WIN", deltaCents: payoutCents, refId: state.roundId });
  return { ok: true, payoutCents, multiplier: mult };
}
