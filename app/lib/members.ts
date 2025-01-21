import { Query } from "node-appwrite";
import { databases } from "./appwrite";
import { config, CACHE_TTL } from "../config";
import { memberCache } from "./appwrite";
import type { Member, UniqueValues } from "../types";

interface MemberDataResponse {
  members: Member[];
  uniqueValues: UniqueValues;
}

export async function fetchAndCacheMemberData(): Promise<MemberDataResponse> {
  const now = Date.now();

  // Return cached data if valid
  if (
    memberCache.data &&
    memberCache.timestamp &&
    now - memberCache.timestamp < CACHE_TTL
  ) {
    console.log("[Cache HIT] Using cached member data");
    return {
      members: memberCache.data,
      uniqueValues: memberCache.uniqueValues!,
    };
  }

  console.log("[Cache MISS] Fetching fresh member data");
  try {
    // Get total count
    const countResponse = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.collectionId,
      [Query.isNotNull("guild")]
    );
    const total = countResponse.total;

    // Fetch all documents in batches
    const batchSize = 100;
    const batches = Math.ceil(total / batchSize);
    const allMembers: Member[] = [];

    for (let i = 0; i < batches; i++) {
      const response = await databases.listDocuments(
        config.appwrite.databaseId,
        config.appwrite.collectionId,
        [
          Query.isNotNull("guild"),
          Query.limit(batchSize),
          Query.offset(i * batchSize),
          Query.orderAsc("guild"),
          Query.orderAsc("ingame_name"),
        ]
      );
      allMembers.push(...(response.documents as unknown as Member[]));
    }

    // Calculate unique values
    const uniqueValues = allMembers.reduce(
      (acc, doc) => {
        if (doc.guild?.trim()) acc.guilds.add(doc.guild.trim());
        if (doc.primary_weapon?.trim())
          acc.primaryWeapons.add(doc.primary_weapon.trim());
        if (doc.secondary_weapon?.trim())
          acc.secondaryWeapons.add(doc.secondary_weapon.trim());
        return acc;
      },
      {
        guilds: new Set<string>(),
        primaryWeapons: new Set<string>(),
        secondaryWeapons: new Set<string>(),
      }
    );

    // Convert sets to sorted arrays
    const sortedUniqueValues: UniqueValues = {
      guilds: Array.from(uniqueValues.guilds).sort(),
      primaryWeapons: Array.from(uniqueValues.primaryWeapons).sort(),
      secondaryWeapons: Array.from(uniqueValues.secondaryWeapons).sort(),
    };

    // Update cache
    memberCache.data = allMembers;
    memberCache.timestamp = now;
    memberCache.uniqueValues = sortedUniqueValues;

    return {
      members: allMembers,
      uniqueValues: sortedUniqueValues,
    };
  } catch (error) {
    console.error("[ERROR] Error fetching member data:", error);
    throw error;
  }
}
