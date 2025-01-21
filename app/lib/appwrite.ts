import { Client, Databases } from "node-appwrite";
import { config } from "../config";
import { MemberCache } from "../types";

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
