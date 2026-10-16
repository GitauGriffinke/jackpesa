"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PHONE_PATTERN = /^254\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("254");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!PHONE_PATTERN.test(phone)) {
      setError("Phone must look like 254XXXXXXXXX");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Log in failed. Try again.");
      return;
    }
    router.push("/dashboard");
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-bold text-text">Welcome back</h1>
      <p className="mt-1 text-sm text-text-muted">Log in with your phone number.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Phone number
          <input
            className={inputClass}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="254XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Password
          <span className="relative">
            <input
              className={`${inputClass} pr-16`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-3 my-auto h-fit text-sm font-medium text-text-muted hover:text-text"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-text focus-visible:outline-none disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        New here?{" "}
        <a href="/signup" className="font-medium text-text underline underline-offset-4">
          Create an account
        </a>
      </p>
    </main>
  );
}
