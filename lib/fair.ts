import { createHash, createHmac, randomBytes } from "node:crypto";

// Shared provably-fair primitives. Every game uses these functions and
// nothing else for randomness. Changing this file changes every game.

const HEX_DIGITS_USED = 13; // 13 hex chars = 52 bits, exact in a double
const TWO_POW_52 = 2 ** 52;

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

// Published before the round starts. Players can check it against the
// revealed seed afterwards.
export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed, "utf8").digest("hex");
}

// Maps (serverSeed, clientSeed, nonce) to a float in [0, 1).
export function outcomeFloat(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number {
  if (!Number.isSafeInteger(nonce) || nonce < 0) {
    throw new Error(`Invalid nonce: ${nonce}`);
  }
  const digest = createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`, "utf8")
    .digest("hex");
  const value = parseInt(digest.slice(0, HEX_DIGITS_USED), 16);
  return value / TWO_POW_52;
}
