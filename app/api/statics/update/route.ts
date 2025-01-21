import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config";
import { hasMasterRole } from "@/app/lib/auth";
import { ID, Query } from "node-appwrite";
import type { UserData } from "@/app/types";

interface StaticUpdateBody {
  discordId: string;
  group: number | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userData = JSON.parse(
      request.headers.get("x-user-data") || "{}"
    ) as UserData;

    // Verify master role
    if (!hasMasterRole(userData.roles)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { discordId, group } = (await request.json()) as StaticUpdateBody;

    if (!discordId || (group !== null && (group < 1 || group > 12))) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    // Check if member exists in statics collection
    const existingDocs = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.staticsCollectionId,
      [Query.equal("discord_id", discordId)]
    );

    if (existingDocs.documents.length > 0) {
      const doc = existingDocs.documents[0];
      if (group === null) {
        // Remove from group
        await databases.deleteDocument(
          config.appwrite.databaseId,
          config.appwrite.staticsCollectionId,
          doc.$id
        );
      } else {
        // Update group
        await databases.updateDocument(
          config.appwrite.databaseId,
          config.appwrite.staticsCollectionId,
          doc.$id,
          { group }
        );
      }
    } else if (group !== null) {
      // Create new record only if assigning to a group
      await databases.createDocument(
        config.appwrite.databaseId,
        config.appwrite.staticsCollectionId,
        ID.unique(),
        {
          discord_id: discordId,
          group,
        }
      );
    }

    // Fetch updated statics to return
    const updatedStatics = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.staticsCollectionId,
      [Query.orderAsc("group")]
    );

    return NextResponse.json({
      success: true,
      statics: updatedStatics.documents,
    });
  } catch (error) {
    console.error("[API ERROR] Error updating static group:", error);
    return NextResponse.json(
      {
        error: "Failed to update static group",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
