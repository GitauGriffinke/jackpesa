import { NextResponse } from "next/server";
import { z } from "zod";
import { hashServerSeed, outcomeFloat } from "@/lib/fair";

const HEX_64 = /^[0-9a-f]{64}$/;

const VerifySchema = z.object({
  serverSeed: z.string().regex(HEX_64, "Server seed must be 64 lowercase hex characters"),
  clientSeed: z.string().min(1, "Client seed is required").max(64),
  nonce: z.number().int().min(0),
  publishedHash: z
    .string()
    .regex(HEX_64, "Published hash must be 64 lowercase hex characters")
    .optional(),
});

// Public endpoint: anyone can recompute a round from its revealed seed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { serverSeed, clientSeed, nonce, publishedHash } = parsed.data;
  const computedHash = hashServerSeed(serverSeed);

  return NextResponse.json({
    serverSeedHash: computedHash,
    matchesPublished: publishedHash === undefined ? null : publishedHash === computedHash,
    outcome: outcomeFloat(serverSeed, clientSeed, nonce),
  });
}
