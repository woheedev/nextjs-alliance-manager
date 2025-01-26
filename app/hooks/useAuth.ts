"use client";

import { useSession, signOut } from "next-auth/react";
import type { User } from "@/app/types";
import { hasMasterRole, hasAnyRequiredRole } from "../lib/auth";

export function useAuth() {
  const { data: session, status } = useSession();

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        username: session.user.name || "",
        roles: session.user.roles || [], // Ensure roles are always an array
        isMaster: hasMasterRole(session.user.roles || []),
        hasAccess: session.user.hasAccess || false,
        weaponPermissions: session.user.weaponPermissions || [],
      }
    : null;

  const logout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return {
    user,
    isLoading: status === "loading",
    logout,
  };
}
