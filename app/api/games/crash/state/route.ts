import { NextResponse } from "next/server";
import { ensureOpenRound, getCurrentState } from "@/lib/crash-engine";

export async function GET() {
  await ensureOpenRound();
  const state = await getCurrentState();
  if (!state) {
    return NextResponse.json({ error: "No active round" }, { status: 503 });
  }
  return NextResponse.json({
    roundId: state.roundId,
    status: state.status,
    multiplier: state.multiplier,
    serverSeedHash: state.serverSeedHash,
    serverSeed: state.status === "CRASHED" ? state.serverSeed : null,
    countdown: state.countdown,
  });
}
