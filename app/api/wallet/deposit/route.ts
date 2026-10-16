import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { moveMoney } from "@/lib/wallet";
import { toCents } from "@/lib/money";

const DepositSchema = z.object({
  amountKes: z.number().int().min(10).max(150_000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = DepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid amount" },
      { status: 400 },
    );
  }

  const transaction = await moveMoney({
    userId: user.id,
    type: "DEPOSIT",
    deltaCents: toCents(parsed.data.amountKes),
    refId: "simulated-mpesa-deposit",
  });

  return NextResponse.json({
    ok: true,
    transactionId: transaction.id,
    balanceAfterCents: transaction.balanceAfterCents,
  });
}
