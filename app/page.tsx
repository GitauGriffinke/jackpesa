import Link from "next/link";
import LandingCrash from "@/components/LandingCrash";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">

        {/* Live crash animation */}
        <LandingCrash />

        {/* Brand */}
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-accent">Jackpesa</h1>
        <p className="mt-2 text-base text-text-muted">
          Kenya&apos;s fastest demo casino. Bet, win, cash out.
        </p>
        <div className="mt-3 inline-block rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs font-medium text-accent">
          DEMO — No real money. Sandbox only.
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-accent px-8 py-4 text-base font-bold text-page transition-colors hover:bg-accent-hover"
          >
            Play free — Get KES 10,000
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border bg-card px-8 py-4 text-base font-medium text-text transition-colors hover:border-accent/40"
          >
            Log in
          </Link>
        </div>

        <p className="mt-8 text-xs text-text-muted">
          10 games &nbsp;·&nbsp; Provably fair &nbsp;·&nbsp; Instant play
        </p>
      </div>
    </main>
  );
}
