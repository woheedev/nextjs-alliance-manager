import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/app/lib/appwrite";
import { MAX_NOTES_LENGTH } from "@/app/config";
import { Query } from "node-appwrite";
import { getServerSession } from "next-auth";
import { checkAccess } from "@/app/lib/access-control";
import { authOptions } from "@/app/lib/auth-options";

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

// Standard error responses
const ERRORS = {
  UNAUTHORIZED: { message: "Unauthorized access", status: 401 },
  FORBIDDEN: { message: "Insufficient permissions", status: 403 },
  INVALID_INPUT: { message: "Invalid input data", status: 400 },
  NOT_FOUND: { message: "Resource not found", status: 404 },
  SERVER_ERROR: { message: "Internal server error", status: 500 },
} as const;

// Request validation helper
const validateVodUpdate = async (
  discordId: string,
  notes?: string,
  gearScore?: string | null
): Promise<void> => {
  // Validate Discord ID format (17-19 digits)
  if (!discordId || !/^\d{17,19}$/.test(discordId)) {
    throw new Error("Invalid Discord ID format");
  }

  // Validate notes
  if (notes !== undefined) {
    if (typeof notes !== "string") {
      throw new Error("Notes must be a string");
    }
    if (notes.length > MAX_NOTES_LENGTH) {
      throw new Error(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
    }
    // Basic XSS prevention
    if (/<[^>]*>/.test(notes)) {
      throw new Error("HTML tags are not allowed in notes");
    }
  }

  // Validate gear score
  if (gearScore !== undefined && gearScore !== null) {
    const score = parseInt(gearScore);
    if (isNaN(score) || score < 3000 || score > 5000) {
      throw new Error("Gear score must be between 3000 and 5000");
    }
  }

  // Check if user has a thread
  const response = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID!,
    process.env.APPWRITE_VOD_COLLECTION_ID!,
    [Query.equal("discord_id", discordId)]
  );

  if (!response.documents.length) {
    throw new Error("User not found");
  }

  if (!response.documents[0].has_thread) {
    throw new Error("User must have a ticket thread before updating");
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(ERRORS.UNAUTHORIZED, {
        status: ERRORS.UNAUTHORIZED.status,
      });
    }

    const body = await request.json();
    const { discordId, primary, secondary, checked, ...rest } = body;

    // Validate input data
    try {
      await validateVodUpdate(discordId, rest.notes, rest.gear_score);
    } catch (error: any) {
      return NextResponse.json(
        { message: error.message },
        { status: ERRORS.INVALID_INPUT.status }
      );
    }

    if (!checkAccess.canEditWeapon(session.user, primary, secondary)) {
      return NextResponse.json(ERRORS.FORBIDDEN, {
        status: ERRORS.FORBIDDEN.status,
      });
    }

    // Transform the data to match the schema
    const updateData = {
      ...rest,
      has_vod: checked,
      vod_check_lead: checked ? session.user.name : null,
      gear_check_lead: rest.gear_checked ? session.user.name : null,
      // Ensure gear score is within valid range
      gear_score: rest.gear_score
        ? Math.min(Math.max(parseInt(rest.gear_score), 3000), 5000).toString()
        : null,
    };

    // First try to find existing document
    const existingDoc = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_VOD_COLLECTION_ID!,
      [Query.equal("discord_id", discordId)]
    );

    if (existingDoc.documents.length > 0) {
      // Update existing document
      await databases.updateDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_VOD_COLLECTION_ID!,
        existingDoc.documents[0].$id,
        updateData
      );
    } else {
      // Create new document with auto-generated ID
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_VOD_COLLECTION_ID!,
        "unique()",
        {
          discord_id: discordId,
          has_vod: checked || false,
          notes: rest.notes || "",
          vod_check_date: rest.vod_check_date || null,
          gear_checked: rest.gear_checked || false,
          gear_check_date: rest.gear_check_date || null,
          gear_score: updateData.gear_score,
          vod_check_lead: checked ? session.user.name : null,
          gear_check_lead: rest.gear_checked ? session.user.name : null,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VOD update error:", error);
    return NextResponse.json(ERRORS.SERVER_ERROR, {
      status: ERRORS.SERVER_ERROR.status,
    });
  }
}
