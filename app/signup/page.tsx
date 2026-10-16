"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PHONE_PATTERN = /^254\d{9}$/;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("254");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Enter your full name");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setError("Phone must look like 254XXXXXXXXX");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone, password }),
    });
    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Sign up failed. Try again.");
      return;
    }
    router.push("/dashboard");
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-bold text-text">Create your account</h1>
      <p className="mt-1 text-sm text-text-muted">Start with your phone number.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Full name
          <input
            className={inputClass}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ToggleButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Confirm password
          <span className="relative">
            <input
              className={`${inputClass} pr-16`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Type it again"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
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
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-text underline underline-offset-4">
          Log in
        </a>
      </p>
    </main>
  );
}

function ToggleButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-3 my-auto h-fit text-sm font-medium text-text-muted hover:text-text"
    >
      {shown ? "Hide" : "Show"}
    </button>
  );
}
