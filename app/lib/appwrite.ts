import { Client, Databases } from "node-appwrite";
import { config } from "@/app/config/index";
import { MemberCache } from "../types";

function validateEnvVars() {
  const required = [
    "endpoint",
    "projectId",
    "apiKey",
    "databaseId",
    "vodCollectionId",
  ];

  const missing = required.filter(
    (key) => !config.appwrite[key as keyof typeof config.appwrite]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required Appwrite configuration: ${missing.join(", ")}`
    );
  }
}

// Validate environment variables immediately
validateEnvVars();

// Initialize Appwrite
const client = new Client()
  .setEndpoint(config.appwrite.endpoint)
  .setProject(config.appwrite.projectId)
  .setKey(config.appwrite.apiKey);

export const databases = new Databases(client);

// Cache for member data
export const memberCache: MemberCache = {
  data: null,
  timestamp: null,
  uniqueValues: null,
};
