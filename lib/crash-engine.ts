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
  serverSeed: string | null; // revealed only after crash
  startTime: number | null;
  countdown: number; // seconds remaining in WAITING
}

interface ActiveBet {
  userId: string;
  amountCents: number;
  betId: string;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
}

const WAITING_SECONDS = 7;
const TICK_MS = 100;

let state: CrashState | null = null;
let activeBets: Map<string, ActiveBet> = new Map();
let engineStarted = false;

function crashPoint(float: number): number {
  return Math.max(1.0, 0.99 / (1 - float));
}

function currentMultiplier(startTime: number): number {
  const elapsed = (Date.now() - startTime) / 1000;
  return Math.max(1.0, Math.pow(Math.E, 0.1 * elapsed));
}

async function startRound() {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = "house";
  const nonce = Date.now();
  const float = outcomeFloat(serverSeed, clientSeed, nonce);
  const cp = crashPoint(float);

  const round = await prisma.round.create({
    data: {
      game: "crash",
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      outcome: { crashPoint: cp },
      status: "OPEN",
    },
  });

  activeBets = new Map();
  state = {
    roundId: round.id,
    status: "WAITING",
    multiplier: 1.0,
    crashPoint: cp,
    serverSeedHash,
    serverSeed: null,
    startTime: null,
    countdown: WAITING_SECONDS,
  };
}

async function settleRound() {
  if (!state) return;
  const { roundId, crashPoint: cp, serverSeed } = state;

  for (const [, bet] of activeBets) {
    if (!bet.cashedOut) {
      // Lost — BET was already written. No WIN row.
      await prisma.bet.updateMany({
        where: { id: bet.betId },
        data: { status: "LOST", payoutCents: 0 },
      });
    }
  }

  await prisma.round.update({
    where: { id: roundId },
    data: { status: "SETTLED", outcome: { crashPoint: cp } },
  });

  if (state) state.serverSeed = serverSeed;
}

function tick() {
  if (!state) return;

  if (state.status === "WAITING") {
    state.countdown -= TICK_MS / 1000;
    if (state.countdown <= 0) {
      state.status = "RUNNING";
      state.startTime = Date.now();
    }
    return;
  }

  if (state.status === "RUNNING" && state.startTime) {
    const mult = currentMultiplier(state.startTime);
    state.multiplier = parseFloat(mult.toFixed(2));
    if (mult >= state.crashPoint) {
      state.status = "CRASHED";
      state.multiplier = parseFloat(state.crashPoint.toFixed(2));
      settleRound().then(() => {
        setTimeout(() => startRound(), 3000);
      });
    }
  }
}

export function startEngine() {
  if (engineStarted) return;
  engineStarted = true;
  startRound().then(() => {
    setInterval(tick, TICK_MS);
  });
}

export function getState(): CrashState | null {
  return state;
}

export async function placeCrashBet(
  userId: string,
  amountCents: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!state || state.status !== "WAITING") {
    return { ok: false, error: "Betting is closed. Wait for the next round." };
  }
  if (activeBets.has(userId)) {
    return { ok: false, error: "You already have a bet in this round." };
  }

  try {
    const betTx = await moveMoney({
      userId,
      type: "BET",
      deltaCents: -amountCents,
      refId: state.roundId,
    });

    const bet = await prisma.bet.create({
      data: {
        userId,
        roundId: state.roundId,
        game: "crash",
        amountCents,
        payoutCents: 0,
        status: "PENDING",
      },
    });

    activeBets.set(userId, {
      userId,
      amountCents,
      betId: bet.id,
      cashedOut: false,
      cashoutMultiplier: null,
    });

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bet failed.";
    return { ok: false, error: message };
  }
}

export async function cashOut(
  userId: string,
): Promise<{ ok: boolean; payoutCents?: number; multiplier?: number; error?: string }> {
  if (!state || state.status !== "RUNNING") {
    return { ok: false, error: "Not in a running round." };
  }

  const bet = activeBets.get(userId);
  if (!bet) return { ok: false, error: "No active bet found." };
  if (bet.cashedOut) return { ok: false, error: "Already cashed out." };

  const mult = state.multiplier;
  const payoutCents = Math.floor(bet.amountCents * mult);

  bet.cashedOut = true;
  bet.cashoutMultiplier = mult;

  await moveMoney({
    userId,
    type: "WIN",
    deltaCents: payoutCents,
    refId: state.roundId,
  });

  await prisma.bet.updateMany({
    where: { id: bet.betId },
    data: { status: "WON", payoutCents },
  });

  return { ok: true, payoutCents, multiplier: mult };
}
