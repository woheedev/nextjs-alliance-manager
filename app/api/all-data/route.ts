import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config";
import { fetchAndCacheMemberData } from "@/app/lib/members";
import { Query } from "node-appwrite";
import type { UserData, VodTracking } from "@/app/types";

interface VodMap {
  [key: string]: VodTracking;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get user data from middleware
    const userData = JSON.parse(
      request.headers.get("x-user-data") || "{}"
    ) as UserData;

    // Fetch member data
    const memberData = await fetchAndCacheMemberData();

    // Fetch VOD tracking data
    const vodResponse = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.vodCollectionId
    );

    // Convert VOD data to a map
    const vodMap: VodMap = {};
    vodResponse.documents.forEach((doc) => {
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

    // Fetch statics data
    const staticsResponse = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.staticsCollectionId,
      [Query.orderAsc("group")]
    );

    return NextResponse.json({
      members: memberData.members,
      uniqueValues: memberData.uniqueValues,
      vodTracking: vodMap,
      statics: staticsResponse.documents,
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
