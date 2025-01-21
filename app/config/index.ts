export const DISCORD_API = "https://discord.com/api/v10";

export const MAX_NOTES_LENGTH = 500;

interface Config {
  discord: {
    clientId: string;
    clientSecret: string;
    guildId: string;
  };
  jwt: {
    secret: string;
  };
  appwrite: {
    databaseId: string;
    collectionId: string;
    vodCollectionId: string;
  };
}

export const config: Config = {
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    guildId: process.env.DISCORD_GUILD_ID!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  appwrite: {
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    collectionId: process.env.APPWRITE_COLLECTION_ID!,
    vodCollectionId: process.env.APPWRITE_VOD_COLLECTION_ID!,
  },
};
