import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config";
import { hasMasterRole } from "@/app/lib/auth";
import { Query } from "node-appwrite";
import type { UserData } from "@/app/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userData = JSON.parse(
      request.headers.get("x-user-data") || "{}"
    ) as UserData;

    if (!hasMasterRole(userData.roles)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.staticsCollectionId,
      [Query.orderAsc("group")]
    );

    return NextResponse.json({ groups: response.documents });
  } catch (error) {
    console.error("Error fetching static groups:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch static groups",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
