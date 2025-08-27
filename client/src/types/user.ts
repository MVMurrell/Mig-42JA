// client/src/types/user.ts
export type Role = "user" | "moderator" | "admin";

export interface AppUser {
  id: string;
  email: string;
  role: Role;

  // fields used around the app (optional)
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  gemCoins?: number | null;

  emailVerified?: boolean | null;
  claims?: {
    sub?: string;
    email?: string;
    role?: string;
    [k: string]: unknown;
  };
}
