import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatKES } from "@/lib/money";
import LogoutButton from "@/components/LogoutButton";

// Reads the session cookie, so it can only run per request. It lives in its
// own component so the surrounding page can prerender inside a Suspense boundary.
async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <section className="rounded-2xl bg-card p-6">
      <p className="text-sm text-text-muted">Welcome, {user.name}</p>
      <p className="mt-4 text-sm text-text-muted">Balance</p>
      <p className="text-3xl font-bold text-accent">{formatKES(user.balanceCents)}</p>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-6 px-6 py-12">
      <Suspense fallback={<p className="text-sm text-text-muted">Loading your balance...</p>}>
        <DashboardContent />
      </Suspense>
      <LogoutButton />
    </main>
  );
}
