import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { moveMoney, InsufficientFundsError } from "@/lib/wallet";
import { toCents } from "@/lib/money";

const MIN_WITHDRAWAL_KES = 100;

const WithdrawSchema = z.object({
  amountKes: z.number().int().min(MIN_WITHDRAWAL_KES).max(150_000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = WithdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid amount" },
      { status: 400 },
    );
  }

  try {
    const transaction = await moveMoney({
      userId: user.id,
      type: "WITHDRAWAL",
      deltaCents: -toCents(parsed.data.amountKes),
      refId: "simulated-mpesa-withdrawal",
    });
    return NextResponse.json({
      ok: true,
      transactionId: transaction.id,
      balanceAfterCents: transaction.balanceAfterCents,
    });
  } catch (error: unknown) {
    if (error instanceof InsufficientFundsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
