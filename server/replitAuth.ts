import type { Express, RequestHandler } from "express";

export async function setupAuth(app: Express) {
  console.warn("(Auth Stub) Replacing Replit OIDC with fake auth for local/Vercel.");

  app.use((req: any, _res, next) => {
    req.isAuthenticated = () => true;
    req.user = {
      id: "stub-user-id",
      email: "test@example.com",
      name: "Local Dev User",
      claims: {
        sub: "stub-user-id",
        email: "test@example.com",
        email_verified: true
      }
    };
    next();
  });
}

export const isAuthenticated: RequestHandler = (_req, _res, next) => next();
export const normalizeUser = (user: any) => user;
export const getUserProfile = (req: any) => req.user || null;
export const requireAuth: RequestHandler = (_req, _res, next) => next();
