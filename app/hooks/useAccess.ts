import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./useAuth";
import type { AccessControl } from "@/app/lib/access-control";

export function useAccess(accessRule: AccessControl) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (accessRule.requiresAuth && !user) {
        router.push("/login");
      } else if (user && !accessRule.check(user)) {
        router.push(accessRule.redirectTo || "/login");
      }
    }
  }, [user, isLoading, accessRule, router]);

  return {
    isLoading,
    user,
    hasAccess: !isLoading && user && accessRule.check(user),
  };
}
