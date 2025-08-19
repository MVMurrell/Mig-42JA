// server/devAuth.ts
import type { Request, Response, NextFunction } from "express";
// If you're using Drizzle:
import { db } from "./db"; // adjust path to your db client
import { users } from "../shared/schema"; // adjust to your users table export
import { eq } from "drizzle-orm";

const DEV =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH !== "false";

export const DEV_USER = {
  id: "dev-user-1", // UUID or string to match schema type
  username: "devuser",
  email: "dev@local.test",
  name: "Dev User",
  createdAt: new Date(),
};

export async function ensureDevUser() {
  if (!DEV) return;
  try {
    // Try to find the user; insert if missing
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, DEV_USER.id));
    if (existing.length === 0) {
      // match your column names
      await db
        .insert(users)
        .values({
          id: DEV_USER.id,
          username: DEV_USER.username,
          email: DEV_USER.email,
          name: DEV_USER.name,
          createdAt: DEV_USER.createdAt as any,
        } as any)
        .onConflictDoNothing?.(); // if available in your drizzle version
    }
  } catch (e) {
    console.warn("[devAuth] ensureDevUser failed:", e);
  }
}

// Attaches req.user for local dev
export function devAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (DEV) {
    (req as any).user = DEV_USER;
  }
  next();
}
