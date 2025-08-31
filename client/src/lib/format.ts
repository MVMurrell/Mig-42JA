// src/lib/format.ts
export const fmtDateTime = (d?: string | number | Date | null) =>
  d ? new Date(d).toLocaleString() : "—";

export const fmtDate = (d?: string | number | Date | null) =>
  d ? new Date(d).toLocaleDateString() : "—";

// src/lib/format.ts
export const fmtNum = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString() : "0";
