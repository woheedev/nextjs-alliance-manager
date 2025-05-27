export const appwriteConfig = {
  endpoint: process.env.APPWRITE_ENDPOINT!,
  projectId: process.env.APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.APPWRITE_DATABASE_ID!,
  collectionId: process.env.APPWRITE_COLLECTION_ID!,
  vodCollectionId: process.env.APPWRITE_VOD_COLLECTION_ID!,
  staticsCollectionId: process.env.APPWRITE_STATICS_COLLECTION_ID!,
  staticsPreset2CollectionId:
    process.env.APPWRITE_STATICS_PRESET2_COLLECTION_ID!,
};
