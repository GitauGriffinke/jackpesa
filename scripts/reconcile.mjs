// Ledger reconciliation (SC-6).
// Rule: sum of all signed ledger amounts must equal sum of all user balances.
// Credits are positive (DEPOSIT, WIN, ADJUSTMENT, REFUND).
// Debits are negative (BET, WITHDRAWAL).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ledger = await prisma.transaction.aggregate({
  _sum: { amountCents: true },
});
const balances = await prisma.user.aggregate({
  _sum: { balanceCents: true },
});

const ledgerTotal = ledger._sum.amountCents ?? 0;
const balanceTotal = balances._sum.balanceCents ?? 0;
const globalDiff = ledgerTotal - balanceTotal;

// Per-user check: each user's ledger sum must equal their balance.
const perUser = await prisma.transaction.groupBy({
  by: ["userId"],
  _sum: { amountCents: true },
});
const users = await prisma.user.findMany({
  select: { id: true, phone: true, balanceCents: true },
});
const ledgerByUser = new Map(
  perUser.map((row) => [row.userId, row._sum.amountCents ?? 0]),
);
const mismatches = users.filter(
  (u) => (ledgerByUser.get(u.id) ?? 0) !== u.balanceCents,
);

console.log(`Ledger total (cents):   ${ledgerTotal}`);
console.log(`Balance total (cents):  ${balanceTotal}`);
console.log(`Users checked:          ${users.length}`);

let failed = false;
if (globalDiff !== 0) {
  console.error(`FAIL: global difference of ${globalDiff} cents.`);
  failed = true;
}
for (const u of mismatches) {
  console.error(
    `FAIL: user ${u.phone} balance ${u.balanceCents} does not match ledger.`,
  );
  failed = true;
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log("PASS: ledger reconciles with balances.");
}

await prisma.$disconnect();
