export const config = {
  jwt: {
    secret: process.env.JWT_SECRET as string,
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID as string,
    clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    guildId: process.env.DISCORD_GUILD_ID as string,
  },
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT as string,
    projectId: process.env.APPWRITE_PROJECT_ID as string,
    apiKey: process.env.APPWRITE_API_KEY as string,
    databaseId: process.env.APPWRITE_DATABASE_ID as string,
    collectionId: process.env.APPWRITE_COLLECTION_ID as string,
    vodCollectionId: process.env.APPWRITE_VOD_COLLECTION_ID as string,
    staticsCollectionId: process.env.APPWRITE_STATICS_COLLECTION_ID as string,
  },
};

export const DISCORD_API = "https://discord.com/api/v10";
export const MAX_NOTES_LENGTH = 500;
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface WeaponRole {
  primary: string;
  secondary: string;
}

export const WEAPON_LEAD_ROLES: Record<string, WeaponRole> = {
  "1323121646336479253": { primary: "SNS", secondary: "GS" },
  "1323121710861516901": { primary: "SNS", secondary: "Wand" },
  "1323121684147994756": { primary: "SNS", secondary: "Dagger" },
  "1324201709886509107": { primary: "SNS", secondary: "Spear" },
  // ... rest of the roles
};

export const MASTER_ROLES = ["1309271313398894643", "1309284427553312769"];
