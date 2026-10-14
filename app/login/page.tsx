"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PHONE_PATTERN = /^254\d{9}$/;

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("254");
  const [password, setPassword] = useState("");
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

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="mb-4 rounded bg-amber-100 px-3 py-2 text-center text-xs text-amber-900">
        DEMO: No real money. Sandbox payments only.
      </p>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border border-gray-300 px-3 py-2"
          placeholder="254XXXXXXXXX"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
        />
        <input
          className="rounded border border-gray-300 px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        New here?{" "}
        <a href="/signup" className="text-amber-700 underline">Create an account</a>
      </p>
    </main>
  );
}
