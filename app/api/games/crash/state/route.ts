import { NextResponse } from "next/server";
import { startEngine, getState } from "@/lib/crash-engine";

startEngine();

export async function GET() {
  const state = getState();
  if (!state) {
    return NextResponse.json({ error: "Engine not ready" }, { status: 503 });
  }
  // Never expose the crash point or server seed before the crash.
  return NextResponse.json({
    roundId: state.roundId,
    status: state.status,
    multiplier: state.multiplier,
    serverSeedHash: state.serverSeedHash,
    serverSeed: state.status === "CRASHED" ? state.serverSeed : null,
    countdown: Math.max(0, Math.ceil(state.countdown)),
  });
}
