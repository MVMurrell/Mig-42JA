import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  claims?: {
    sub: string;
    email: string;
    email_verified: boolean;
  };
} | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchUser() {
      try {
        // 🚀 Later: point this to your real backend auth endpoint
        // For now, just return the stub user directly
        const stubUser: User = {
          id: "stub-user-id",
          email: "test@example.com",
          name: "Local Dev User",
          claims: {
            sub: "stub-user-id",
            email: "test@example.com",
            email_verified: true
          }
        };

        if (!ignore) {
          setUser(stubUser);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      ignore = true;
    };
  }, []);

  return { user, loading };
}
