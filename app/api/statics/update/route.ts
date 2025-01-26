import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config";
import { ID, Query } from "node-appwrite";
import { getServerSession } from "next-auth";
import { checkAccess } from "@/app/lib/access-control";
import { hasMasterRole } from "@/app/lib/auth";
import { authOptions } from "@/app/lib/auth-options";

interface StaticUpdateBody {
  discordId: string;
  group: number | null;
}

const BATCH_SIZE = 100; // Appwrite's default limit

async function fetchAllStatics() {
  // First get total count
  const countResponse = await databases.listDocuments(
    config.appwrite.databaseId,
    config.appwrite.staticsCollectionId,
    [Query.limit(1)]
  );
  const total = countResponse.total;
  console.log(`[API] Found ${total} total static assignments to fetch`);

  // Fetch all documents in batches
  const batches = Math.ceil(total / BATCH_SIZE);
  const allStatics = [];

  for (let i = 0; i < batches; i++) {
    console.log(
      `[API] Fetching statics batch ${
        i + 1
      }/${batches} (${BATCH_SIZE} per batch)`
    );
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = hasMasterRole(session.user.roles || []);

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { discordId, group } = (await request.json()) as StaticUpdateBody;

    if (!discordId || (group !== null && (group < 1 || group > 12))) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    console.log(
      `[API] Updating static group for ${discordId} to ${
        group === null ? "null" : group
      }`
    );

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
        console.log(`[API] Removing member ${discordId} from static group`);
        await databases.deleteDocument(
          config.appwrite.databaseId,
          config.appwrite.staticsCollectionId,
          doc.$id
        );
      } else {
        // Update group
        console.log(`[API] Updating member ${discordId} to group ${group}`);
        await databases.updateDocument(
          config.appwrite.databaseId,
          config.appwrite.staticsCollectionId,
          doc.$id,
          { group }
        );
      }
    } else if (group !== null) {
      // Create new record only if assigning to a group
      console.log(
        `[API] Creating new static group entry for member ${discordId} in group ${group}`
      );
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

    // Use the new batch fetching function for the response
    const updatedStatics = await fetchAllStatics();

    return NextResponse.json({
      success: true,
      statics: updatedStatics,
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
