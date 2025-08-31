// src/lib/dates.ts
export const toDate = (
  v: string | number | Date | null | undefined
): Date | null => (v ? new Date(v) : null);
