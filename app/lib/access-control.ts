import type { User } from "@/app/types";
import { hasMasterRole, hasWeaponLeadPermission } from "./auth";

export interface AccessControl {
  requiresAuth: boolean;
  check: (user: User) => boolean;
  redirectTo?: string;
}

export const AccessRules = {
  weaponLead: {
    requiresAuth: true,
    check: (user: User) => user.hasAccess,
    redirectTo: "/login",
  },
  master: {
    requiresAuth: true,
    check: (user: User) => hasMasterRole(user.roles),
    redirectTo: "/vodtracker",
  },
  weaponSpecific: (primary: string, secondary: string): AccessControl => ({
    requiresAuth: true,
    check: (user: User) => hasWeaponLeadPermission(user, primary, secondary),
    redirectTo: "/vodtracker",
  }),
} as const;

// Helper functions for common access checks
export const checkAccess = {
  isWeaponLead: (user: User) => user.hasAccess,
  isMaster: (user: User | any) => {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return hasMasterRole(roles);
  },
  canEditWeapon: (user: User, primary: string, secondary: string) =>
    hasWeaponLeadPermission(user, primary, secondary),
  hasAnyAccess: (user: User) => user.hasAccess || hasMasterRole(user.roles),
  getAccessLevel: (user: User): "both" | "master" | "weaponLead" | "none" => {
    const isMaster = hasMasterRole(user.roles);
    const isWeaponLead = user.hasAccess;

    if (isMaster && isWeaponLead) return "both";
    if (isMaster) return "master";
    if (isWeaponLead) return "weaponLead";
    return "none";
  },
};
