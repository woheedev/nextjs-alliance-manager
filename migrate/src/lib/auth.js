// Constants for role IDs
const MASTER_ROLE_IDS = ["1309271313398894643", "1309284427553312769"];

// Memoization cache for performance
const memoCache = new Map();

// Helper functions to check permissions based on user object from server
export const hasWeaponLeadPermission = (user, primary, secondary) => {
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

export const hasMasterRole = (userOrRoles) => {
  if (!userOrRoles) return false;

  // If it's an array, it's the roles array
  if (Array.isArray(userOrRoles)) {
    const cacheKey = userOrRoles.join("-");
    if (memoCache.has(cacheKey)) {
      return memoCache.get(cacheKey);
    }

    const result = userOrRoles.some((role) => MASTER_ROLE_IDS.includes(role));
    memoCache.set(cacheKey, result);
    return result;
  }

  // If it's an object, it's the user object
  return userOrRoles.isMaster || false;
};

export const hasAnyRequiredRole = (user) => {
  if (!user) return false;
  return user.hasAccess || false;
};

// Clear cache when needed (e.g., on logout)
export const clearAuthCache = () => {
  memoCache.clear();
};
