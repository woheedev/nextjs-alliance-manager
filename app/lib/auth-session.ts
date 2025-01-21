import jwt from "jsonwebtoken";
import { config, DISCORD_API } from "@/app/config";
import { headers } from "next/headers";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface GuildMember {
  roles: string[];
}

export async function createSession(code: string): Promise<string> {
  // Get host from request headers
  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  const redirectUri = `${protocol}://${host}/api/auth/discord/callback`;

  const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.discord.clientId,
      client_secret: config.discord.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenResponse.json()) as DiscordTokenResponse;
  if (!tokenResponse.ok) {
    throw new Error("Token exchange failed");
  }

  // Get user data
  const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = (await userResponse.json()) as DiscordUser;

  // Get guild member data
  const memberResponse = await fetch(
    `${DISCORD_API}/users/@me/guilds/${config.discord.guildId}/member`,
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  );
  const memberData = (await memberResponse.json()) as GuildMember;

  // Create session token
  return jwt.sign(
    {
      userId: userData.id,
      roles: memberData.roles || [],
      username: userData.username,
    },
    config.jwt.secret,
    { expiresIn: "7d" }
  );
}
