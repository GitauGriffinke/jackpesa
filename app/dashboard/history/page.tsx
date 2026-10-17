import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/money";

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit", WITHDRAWAL: "Withdrawal", BET: "Bet",
  WIN: "Win", REFUND: "Refund", ADJUSTMENT: "Bonus", ADMIN_ADJUST: "Adjustment",
};
const TYPE_COLOR: Record<string, string> = {
  DEPOSIT: "text-win", WIN: "text-win", REFUND: "text-win", ADJUSTMENT: "text-win",
  BET: "text-loss", WITHDRAWAL: "text-loss", ADMIN_ADJUST: "text-text-muted",
};

async function HistoryTable() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
      {txs.length === 0 ? (
        <p className="p-8 text-center text-sm text-text-muted">No transactions yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-muted">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted">Balance</th>
              <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) => (
              <tr key={tx.id} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-surface/30"}`}>
                <td className="px-4 py-3">
                  <span className={`font-medium ${TYPE_COLOR[tx.type] ?? "text-text"}`}>
                    {TYPE_LABEL[tx.type] ?? tx.type}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${tx.amountCents >= 0 ? "text-win" : "text-loss"}`}>
                  {tx.amountCents >= 0 ? "+" : ""}{formatKES(tx.amountCents)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-muted">
                  {formatKES(tx.balanceAfterCents)}
                </td>
                <td className="hidden px-4 py-3 text-right text-text-muted sm:table-cell">
                  {new Date(tx.createdAt).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">← Back</a>
      <h1 className="mt-4 text-2xl font-bold text-text">Transaction History</h1>
      <p className="mt-1 text-sm text-text-muted">Last 50 transactions.</p>
      <Suspense fallback={
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-sm text-text-muted">
          Loading transactions…
        </div>
      }>
        <HistoryTable />
      </Suspense>
    </main>
  );
}
