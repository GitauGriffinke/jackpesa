import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Must match SESSION_COOKIE in lib/auth.ts. This file can't import lib/auth.ts
// because that file loads Prisma, which doesn't run on the edge.
const SESSION_COOKIE = "jackpesa_session";

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return redirectToLogin(request);

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return NextResponse.next();
  } catch {
    // Expired or tampered token.
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
