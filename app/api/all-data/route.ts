import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config";
import { fetchAndCacheMemberData } from "@/app/lib/members";
import { Query } from "node-appwrite";
import type { VodTracking } from "@/app/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

interface VodMap {
  [key: string]: VodTracking;
}

const BATCH_SIZE = 100;

async function fetchAllStatics() {
  const countResponse = await databases.listDocuments(
    config.appwrite.databaseId,
    config.appwrite.staticsCollectionId,
    [Query.limit(1)]
  );
  const total = countResponse.total;

  // Skip if no records exist
  if (total === 0) {
    return [];
  }

  const batches = Math.ceil(total / BATCH_SIZE);
  const allStatics = [];

  for (let i = 0; i < batches; i++) {
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.staticsCollectionId,
      [
        Query.limit(BATCH_SIZE),
        Query.offset(i * BATCH_SIZE),
        Query.orderAsc("group"),
      ]
    );
    allStatics.push(...response.documents);
  }

  return allStatics;
}

async function fetchAllVodData() {
  // First get total count
  const countResponse = await databases.listDocuments(
    config.appwrite.databaseId,
    config.appwrite.vodCollectionId,
    [Query.limit(1)]
  );
  const total = countResponse.total;
  console.log(`[API] Found ${total} total VOD records to fetch`);

  // Skip if no records exist
  if (total === 0) {
    return [];
  }

  // Fetch all documents in batches
  const batches = Math.ceil(total / BATCH_SIZE);
  const allVods = [];

  for (let i = 0; i < batches; i++) {
    console.log(
      `[API] Fetching VOD batch ${i + 1}/${batches} (${BATCH_SIZE} per batch)`
    );
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.vodCollectionId,
      [Query.limit(BATCH_SIZE), Query.offset(i * BATCH_SIZE)]
    );
    allVods.push(...response.documents);
  }

  return allVods;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch member data
    const memberData = await fetchAndCacheMemberData();

    // Fetch VOD tracking data using batch fetching
    const vodDocs = await fetchAllVodData();

    // Convert VOD data to a map
    const vodMap: VodMap = {};
    vodDocs.forEach((doc) => {
      vodMap[doc.discord_id] = {
        has_vod: doc.has_vod,
        notes: doc.notes || "",
        vod_check_date: doc.vod_check_date || null,
        vod_check_lead: doc.vod_check_lead || null,
        gear_checked: doc.gear_checked || false,
        gear_check_date: doc.gear_check_date || null,
        gear_check_lead: doc.gear_check_lead || null,
        gear_score: doc.gear_score ?? "",
      };
    });

    // Fetch statics data using batch fetching
    const statics = await fetchAllStatics();

    return NextResponse.json({
      members: memberData.members,
      uniqueValues: memberData.uniqueValues,
      vodTracking: vodMap,
      statics,
    });
  } catch (error) {
    console.error("[API ERROR] Error fetching all data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
