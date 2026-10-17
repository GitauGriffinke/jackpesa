import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cashOut } from "@/lib/crash-engine";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const result = await cashOut(user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, payoutCents: result.payoutCents, multiplier: result.multiplier });
}
