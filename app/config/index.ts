import { discordConfig } from "./discord";
import { appwriteConfig } from "./appwrite";

export * from "./discord";
export * from "./appwrite";
export * from "./constants";
export * from "./navigation";

// Main config object that combines all configurations
export const config = {
  discord: discordConfig,
  appwrite: appwriteConfig,
};
