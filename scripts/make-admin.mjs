// Grants the ADMIN role to one user. Run from a terminal only.
// Usage: node --env-file=.env.local scripts/make-admin.mjs 254XXXXXXXXX
import { PrismaClient } from "@prisma/client";

const phone = process.argv[2];
if (!/^254\d{9}$/.test(phone ?? "")) {
  console.error("Usage: node --env-file=.env.local scripts/make-admin.mjs 254XXXXXXXXX");
  process.exit(1);
}

const prisma = new PrismaClient();
const result = await prisma.user.updateMany({
  where: { phone },
  data: { role: "ADMIN" },
});

if (result.count !== 1) {
  console.error(`No user found with phone ${phone}.`);
  process.exitCode = 1;
} else {
  console.log(`Granted ADMIN to ${phone}.`);
}

await prisma.$disconnect();
