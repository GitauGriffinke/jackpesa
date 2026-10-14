import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatKES } from "@/lib/money";
import LogoutButton from "@/components/LogoutButton";

// Reads the session cookie, so it can only run per request. It lives in its
// own component so the surrounding page can prerender inside a Suspense boundary.
async function DashboardContent() {
  const user = await getCurrentUser();
  // The middleware already checks the cookie. This also catches a valid-looking
  // cookie whose user no longer exists.
  if (!user) redirect("/login");

  return (
    <section className="rounded-xl bg-[#EFECE6] p-6">
      <p className="text-sm text-gray-600">Welcome, {user.name}</p>
      <p className="mt-2 text-sm text-gray-600">Balance</p>
      <p className="text-3xl font-bold text-amber-600">
        {formatKES(user.balanceCents)}
      </p>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 px-4 py-8">
      <p className="rounded bg-amber-100 px-3 py-2 text-center text-xs text-amber-900">
        DEMO: No real money. Sandbox payments only.
      </p>
      <Suspense fallback={<p className="text-sm text-gray-600">Loading your balance...</p>}>
        <DashboardContent />
      </Suspense>
      <LogoutButton />
    </main>
  );
}
