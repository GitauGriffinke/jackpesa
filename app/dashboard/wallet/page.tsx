"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "deposit" | "withdraw";

const LIMITS: Record<Mode, { min: number; max: number }> = {
  deposit: { min: 10, max: 150_000 },
  withdraw: { min: 100, max: 150_000 },
};

export default function WalletPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const kes = Number(amount);
    const { min, max } = LIMITS[mode];
    if (!Number.isInteger(kes) || kes < min || kes > max) {
      setMessage({ kind: "error", text: `Enter a whole amount between KES ${min} and ${max.toLocaleString("en-KE")}.` });
      return;
    }

    setSubmitting(true);
    const response = await fetch(`/api/wallet/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: kes }),
    });
    setSubmitting(false);

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ kind: "error", text: data?.error ?? "Something went wrong. Try again." });
      return;
    }

    setAmount("");
    setMessage({ kind: "ok", text: mode === "deposit" ? "Deposit credited." : "Withdrawal processed." });
    router.refresh();
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-accent text-text" : "bg-surface text-text-muted border border-zinc-300"
    }`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-text">Wallet</h1>

      <div className="flex gap-3" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "deposit"} className={tabClass(mode === "deposit")} onClick={() => setMode("deposit")}>
          Deposit
        </button>
        <button type="button" role="tab" aria-selected={mode === "withdraw"} className={tabClass(mode === "withdraw")} onClick={() => setMode("withdraw")}>
          Withdraw
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Amount (KES)
          <input
            className="w-full rounded-lg border border-zinc-300 bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            inputMode="numeric"
            placeholder={`${LIMITS[mode].min} to ${LIMITS[mode].max.toLocaleString("en-KE")}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />
        </label>

        {message && (
          <p role="alert" className={message.kind === "ok" ? "text-sm text-text" : "text-sm text-danger"}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-4 py-3 font-semibold text-text transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-text focus-visible:outline-none disabled:opacity-60"
        >
          {submitting ? "Processing..." : mode === "deposit" ? "Deposit" : "Withdraw"}
        </button>
      </form>

      <a href="/dashboard" className="text-sm font-medium text-text underline underline-offset-4">
        Back to dashboard
      </a>
    </main>
  );
}
