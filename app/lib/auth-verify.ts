import jwt from "jsonwebtoken";
import { config, WEAPON_LEAD_ROLES } from "@/app/config";

interface UserSession {
  userId: string;
  roles: string[];
  username: string;
  weaponPermissions?: { primary: string; secondary: string }[];
}

export async function verifyAuth(token: string): Promise<UserSession | null> {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as UserSession;

    // Add weapon permissions based on roles
    decoded.weaponPermissions = decoded.roles
      .filter((role) => WEAPON_LEAD_ROLES[role])
      .map((role) => WEAPON_LEAD_ROLES[role]);

    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
