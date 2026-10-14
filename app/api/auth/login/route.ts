import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signToken } from "@/lib/auth";

const LoginSchema = z.object({
  phone: z.string().regex(/^254\d{9}$/, "Phone must look like 254XXXXXXXXX"),
  password: z.string().min(1).max(72),
});

const INVALID_CREDENTIALS = "Wrong phone number or password";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { phone, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, passwordHash: true },
  });

  // Always run bcrypt, even when the user doesn't exist, so response
  // timing doesn't reveal which phone numbers are registered.
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv",
  );

  if (!user || !passwordMatches) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const token = await signToken(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
