import type { User } from "@/app/types";
import { MASTER_ROLES } from "@/app/config";

// Memoization cache for performance
const memoCache = new Map();

// Memoized role checking utilities
const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Helper functions to check permissions based on user object from server
export const hasWeaponLeadPermission = (
  user: User,
  primary: string,
  secondary: string
): boolean => {
  if (!user?.weaponPermissions) return false;

  // Create cache key
  const cacheKey = `${user.id}-${primary}-${secondary}`;
  if (memoCache.has(cacheKey)) {
    return memoCache.get(cacheKey);
  }

  const result = user.weaponPermissions.some(
    (perm) => perm.primary === primary && perm.secondary === secondary
  );

  memoCache.set(cacheKey, result);
  return result;
};

export const hasMasterRole = (roles: string[]): boolean => {
  if (!roles?.length) return false;

  const cacheKey = roles.join("-");
  if (memoCache.has(cacheKey)) {
    return memoCache.get(cacheKey);
  }

  const result = roles.some((role) => MASTER_ROLES.includes(role));
  memoCache.set(cacheKey, result);
  return result;
};

export const hasAnyRequiredRole = (roles: string[]): boolean => {
  if (!roles?.length) return false;
  return roles.some((role) => MASTER_ROLES.includes(role));
};

// Clear cache when needed (e.g., on logout)
export const clearAuthCache = (): void => {
  memoCache.clear();
};
