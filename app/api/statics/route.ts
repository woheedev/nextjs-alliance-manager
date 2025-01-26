import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config";
import { Query } from "node-appwrite";
import { getServerSession } from "next-auth";
import { checkAccess } from "@/app/lib/access-control";

const BATCH_SIZE = 100;

async function fetchAllStatics() {
  // First get total count
  const countResponse = await databases.listDocuments(
    config.appwrite.databaseId,
    config.appwrite.staticsCollectionId,
    [Query.limit(1)]
  );
  const total = countResponse.total;
  console.log(`[API] Found ${total} total static assignments to fetch`);

  // Skip if no records exist
  if (total === 0) {
    return [];
  }

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkAccess.isMaster(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const statics = await fetchAllStatics();
    return NextResponse.json({ groups: statics });
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
