import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/app/types";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    verifySession()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [router]);

  const verifySession = useCallback(async (): Promise<{ user: User }> => {
    const response = await fetch("/api/auth/verify", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Session verification failed");
    }

    return response.json();
  }, []);

  return {
    user,
    setUser,
    isLoading,
    logout,
    verifySession,
  };
}
