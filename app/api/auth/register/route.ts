import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/money";
import { SESSION_COOKIE, sessionCookieOptions, signToken } from "@/lib/auth";

const DEMO_SIGNUP_CREDIT_CENTS = toCents(10_000);

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^254\d{9}$/, "Phone must look like 254XXXXXXXXX"),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, phone, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, phone, passwordHash, balanceCents: DEMO_SIGNUP_CREDIT_CENTS },
      });
      await tx.transaction.create({
        data: {
          userId: created.id,
          type: "ADJUSTMENT",
          amountCents: DEMO_SIGNUP_CREDIT_CENTS,
          balanceAfterCents: DEMO_SIGNUP_CREDIT_CENTS,
          refId: "demo signup credit",
        },
      });
      return created;
    });

    const token = await signToken(user.id);
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error: unknown) {
    // Prisma error P2002 means the phone number is already registered.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this phone number already exists" },
        { status: 409 },
      );
    }
    throw error;
  }
}
