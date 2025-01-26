import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { config, WEAPON_LEAD_ROLES } from "@/app/config";
import { hasMasterRole } from "./auth";
import { checkAccess } from "./access-control";
import type { User } from "@/app/types";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: config.discord.clientId,
      clientSecret: config.discord.clientSecret,
      authorization: {
        params: {
          scope: "identify guilds.members.read",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async redirect() {
      return "/vodtracker";
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        const memberResponse = await fetch(
          `https://discord.com/api/v10/users/@me/guilds/${config.discord.guildId}/member`,
          {
            headers: { Authorization: `Bearer ${account.access_token}` },
          }
        );
        const memberData = await memberResponse.json();
        token.roles = memberData.roles || [];

        // Extract weapon permissions from roles using WEAPON_LEAD_ROLES mapping
        const weaponPermissions = (memberData.roles || [])
          .filter((role: string) => role in WEAPON_LEAD_ROLES)
          .map((role: string) => WEAPON_LEAD_ROLES[role]);
        token.weaponPermissions = weaponPermissions;
      }
      return token;
    },
    async session({ session, token }) {
      const updatedSession = {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          roles: token.roles || [],
          hasAccess:
            Array.isArray(token.roles) &&
            token.roles.some((role: string) => role in WEAPON_LEAD_ROLES),
          weaponPermissions: token.weaponPermissions || [],
        },
      };

      // Server-side access logging
      const user = updatedSession.user as User;
      const isMaster = hasMasterRole(user.roles);
      const accessLevel = checkAccess.getAccessLevel(user);

      console.log(`[Access Log] User: ${user.id}`);
      console.log(`[Access Log] Master Access: ${isMaster}`);
      console.log(`[Access Log] Access Level: ${accessLevel}`);
      console.log(`[Access Log] Weapon Lead Access: ${user.hasAccess}`);

      // Log weapon lead roles with their specific weapon combinations
      if (user.weaponPermissions && user.weaponPermissions.length > 0) {
        console.log("[Access Log] Weapon Lead Permissions:");
        user.weaponPermissions.forEach(({ primary, secondary }) => {
          console.log(`  - ${primary}/${secondary}`);
        });
      }

      return updatedSession;
    },
  },
};
