// All money in the app is stored as integer cents (1 KES = 100 cents).
// Never store or compute money as a float.

export function assertCents(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid cents value: ${value}. Must be an integer.`);
  }
  return value;
}

// Converts a KES amount (e.g. 12.5) to cents (1250).
// Call this only on user input, once, at the boundary.
export function toCents(kes: number): number {
  if (!Number.isFinite(kes)) {
    throw new Error("Amount must be a finite number.");
  }
  return assertCents(Math.round(kes * 100));
}

// Converts cents (1250) back to KES (12.5) for display or calculation
// at the edge of the system only.
export function fromCents(cents: number): number {
  return assertCents(cents) / 100;
}

// Formats cents for display, e.g. 1250000 -> "KES 12,500.00"
export function formatKES(cents: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(fromCents(cents));
}