import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  adminAdjustBalance,
  AdminAdjustSchema,
  ForbiddenError,
  InsufficientFundsError,
  UserNotFoundError,
} from "@/lib/wallet";

export async function POST(request: Request) {
  const caller = await getCurrentUser();
  if (!caller) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = AdminAdjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const transaction = await adminAdjustBalance(caller.id, parsed.data);
    return NextResponse.json({
      ok: true,
      transactionId: transaction.id,
      balanceAfterCents: transaction.balanceAfterCents,
    });
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InsufficientFundsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
