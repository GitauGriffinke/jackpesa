import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCents } from "@/lib/money";
import type { Transaction, TransactionType } from "@prisma/client";

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient balance");
    this.name = "InsufficientFundsError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

interface MoveParams {
  userId: string;
  type: TransactionType;
  /** Signed: positive credits the wallet, negative debits it. */
  deltaCents: number;
  refId: string | null;
}

// The only function in the codebase allowed to change a balance.
// Debits are a conditional UPDATE, so concurrent debits cannot overdraw.
export async function moveMoney(params: MoveParams): Promise<Transaction> {
  const delta = assertCents(params.deltaCents);
  if (delta === 0) throw new Error("Amount must be non-zero");

  return prisma.$transaction(async (tx) => {
    const updated =
      delta < 0
        ? await tx.user.updateMany({
            where: { id: params.userId, balanceCents: { gte: -delta } },
            data: { balanceCents: { increment: delta } },
          })
        : await tx.user.updateMany({
            where: { id: params.userId },
            data: { balanceCents: { increment: delta } },
          });

    if (updated.count === 0) {
      const exists = await tx.user.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (!exists) throw new UserNotFoundError();
      throw new InsufficientFundsError();
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: params.userId },
      select: { balanceCents: true },
    });

    return tx.transaction.create({
      data: {
        userId: params.userId,
        type: params.type,
        amountCents: delta,
        balanceAfterCents: user.balanceCents,
        refId: params.refId,
      },
    });
  });
}

// Limits the blast radius of one admin action: KES 1,000,000 per adjustment.
const MAX_ADMIN_ADJUST_CENTS = 100_000_000;

export const AdminAdjustSchema = z.object({
  targetUserId: z.string().min(1).max(64),
  deltaCents: z
    .number()
    .int()
    .refine((n) => n !== 0, "Amount must be non-zero")
    .refine(
      (n) => Math.abs(n) <= MAX_ADMIN_ADJUST_CENTS,
      "Adjustment exceeds the KES 1,000,000 limit",
    ),
  reason: z.string().trim().min(3).max(120),
});

export type AdminAdjustInput = z.infer<typeof AdminAdjustSchema>;

// Role is read from the database on every call, never from the session token.
export async function adminAdjustBalance(
  adminUserId: string,
  input: AdminAdjustInput,
): Promise<Transaction> {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    throw new ForbiddenError("Admin privileges required");
  }
  if (input.targetUserId === adminUserId) {
    throw new ForbiddenError("Admins cannot adjust their own balance");
  }

  return moveMoney({
    userId: input.targetUserId,
    type: "ADMIN_ADJUST",
    deltaCents: input.deltaCents,
    refId: `admin:${adminUserId}:${input.reason}`,
  });
}
