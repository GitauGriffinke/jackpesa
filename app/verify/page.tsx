"use client";

import { useState } from "react";

interface VerifyResult {
  serverSeedHash: string;
  matchesPublished: boolean | null;
  outcome: number;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-surface px-4 py-3 font-mono text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function VerifyPage() {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("0");
  const [publishedHash, setPublishedHash] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serverSeed: serverSeed.trim().toLowerCase(),
        clientSeed: clientSeed.trim(),
        nonce: Number(nonce),
        publishedHash: publishedHash.trim().toLowerCase() || undefined,
      }),
    });
    setSubmitting(false);

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? "Verification failed. Check the values and try again.");
      return;
    }
    setResult(data as VerifyResult);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold text-text">Verify a round</h1>
      <p className="text-sm text-text-muted">
        Enter a round&apos;s revealed server seed, client seed, and nonce. The outcome is recomputed
        on the server with the same function every game uses.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Server seed (revealed after the round)
          <input className={inputClass} value={serverSeed} onChange={(e) => setServerSeed(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Client seed
          <input className={inputClass} value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Nonce
          <input className={inputClass} inputMode="numeric" value={nonce} onChange={(e) => setNonce(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          Published server seed hash (optional, shown before the round)
          <input className={inputClass} value={publishedHash} onChange={(e) => setPublishedHash(e.target.value)} />
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
          {submitting ? "Verifying..." : "Verify"}
        </button>
      </form>

      {result && (
        <section className="flex flex-col gap-3 rounded-2xl bg-card p-6 text-sm text-text">
          <p>
            Outcome: <span className="font-mono font-bold text-accent">{result.outcome.toFixed(15)}</span>
          </p>
          <p className="break-all">
            Server seed hash: <span className="font-mono">{result.serverSeedHash}</span>
          </p>
          {result.matchesPublished !== null && (
            <p className={result.matchesPublished ? "font-semibold text-text" : "font-semibold text-danger"}>
              {result.matchesPublished
                ? "Matches the published hash. The seed was fixed before the round."
                : "Does not match the published hash. The seed was changed."}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
