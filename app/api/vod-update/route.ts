import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/app/lib/auth-verify";
import { databases } from "@/app/lib/appwrite";
import { MAX_NOTES_LENGTH } from "@/app/config";
import { Query } from "node-appwrite";

interface VodUpdateBody {
  discordId: string;
  checked: boolean;
  primary: string;
  secondary: string;
  notes?: string;
  vod_check_date?: string;
  gear_checked?: boolean;
  gear_check_date?: string;
  gear_score?: string | null;
}

interface WeaponPermission {
  primary: string;
  secondary: string;
}

// Request validation helper
const validateVodUpdate = async (
  discordId: string,
  notes?: string
): Promise<void> => {
  if (!discordId) {
    throw new Error("Discord ID is required");
  }

  if (notes && (typeof notes !== "string" || notes.length > MAX_NOTES_LENGTH)) {
    throw new Error("Invalid notes format or length");
  }

  // Check if user has a thread
  const response = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID!,
    process.env.APPWRITE_VOD_COLLECTION_ID!,
    [Query.equal("discord_id", discordId)]
  );

  const member = response.documents[0];
  if (!member) {
    throw new Error("User not found");
  }

  if (!member.has_thread) {
    throw new Error("User must have a ticket thread before updating");
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = request.cookies.get("session");
    if (!session?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyAuth(session.value);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { discordId, primary, secondary, ...updateData } = body;

    // Verify permissions
    if (
      !user.weaponPermissions?.some(
        (p: WeaponPermission) => p.primary === primary && p.secondary === secondary
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the document
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VOD_COLLECTION_ID!,
      discordId,
      updateData
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VOD update error:", error);
    return NextResponse.json(
      { error: "Failed to update VOD tracking" },
      { status: 500 }
    );
  }
}
