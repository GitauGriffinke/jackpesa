"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, password }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) { setError(data?.error ?? "Registration failed."); return; }
    router.push("/dashboard");
  }

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-5xl">🎰</span>
          <h1 className="mt-3 text-3xl font-bold text-accent">Jackpesa</h1>
          <p className="mt-1 text-sm text-text-muted">Demo casino. You get KES 10,000 free.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-bold text-text">Create account</h2>
          <p className="mt-1 text-sm text-text-muted">Free demo money. No deposits needed.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              Full name
              <input className={inputClass} placeholder="John Kamau" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              Phone number
              <input className={inputClass} type="tel" placeholder="254712345678" value={phone} onChange={e => setPhone(e.target.value.trim())} autoComplete="tel" />
              <span className="text-xs text-text-muted">Format: 254XXXXXXXXX</span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              Password
              <div className="relative">
                <input
                  className={inputClass}
                  type={showPw ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs">
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              Confirm password
              <input
                className={inputClass}
                type={showPw ? "text" : "password"}
                placeholder="Repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-accent py-3 font-semibold text-page transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account & play"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
