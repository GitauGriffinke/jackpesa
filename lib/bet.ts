import { prisma } from "@/lib/prisma";
import { moveMoney } from "@/lib/wallet";
import { generateServerSeed, hashServerSeed, outcomeFloat } from "@/lib/fair";
import { assertCents } from "@/lib/money";
import type { Bet, Round } from "@prisma/client";

export interface BetResult {
  round: Round;
  bet: Bet;
  float: number;
  payoutCents: number;
  newBalanceCents: number;
}

// resolveFn: given the outcome float (0..1), return the payout in cents.
// Return 0 for a loss. Never return a negative number.
export async function placeBet(
  userId: string,
  game: string,
  amountCents: number,
  clientSeed: string,
  resolveFn: (float: number) => number,
): Promise<BetResult> {
  assertCents(amountCents);
  if (amountCents <= 0) throw new Error("Bet amount must be positive");
  if (!clientSeed.trim()) throw new Error("Client seed is required");

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  return prisma.$transaction(async (tx) => {
    // Nonce = total bets placed by this user so far.
    const nonce = await tx.bet.count({ where: { userId } });

    const float = outcomeFloat(serverSeed, clientSeed, nonce);
    const payoutCents = resolveFn(float);
    if (payoutCents < 0) throw new Error("resolveFn must not return negative");

    // Debit the bet.
    const betTx = await moveMoney({
      userId,
      type: "BET",
      deltaCents: -amountCents,
      refId: null,
    });

    const round = await tx.round.create({
      data: {
        game,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        outcome: { float },
        status: "SETTLED",
      },
    });

    const bet = await tx.bet.create({
      data: {
        userId,
        roundId: round.id,
        game,
        amountCents,
        payoutCents,
        status: payoutCents > 0 ? "WON" : "LOST",
      },
    });

    let newBalanceCents = betTx.balanceAfterCents;

    // Credit the payout if the player won.
    if (payoutCents > 0) {
      const winTx = await moveMoney({
        userId,
        type: "WIN",
        deltaCents: payoutCents,
        refId: round.id,
      });
      newBalanceCents = winTx.balanceAfterCents;
    }

    return { round, bet, float, payoutCents, newBalanceCents };
  });
}
