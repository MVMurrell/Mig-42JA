// types/express.d.ts
import "express-serve-static-core";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: "user" | "moderator" | "admin";
      claims?: Record<string, unknown>; // optional so it never blocks builds
    }
  }
}

export {};
