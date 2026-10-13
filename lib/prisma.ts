import { PrismaClient } from "@prisma/client";

// In development, Next.js hot-reloads modules, which would open a new
// database connection on every save. Storing the client on globalThis
// prevents that.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}