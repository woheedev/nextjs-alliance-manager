import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { databases } from "@/app/lib/appwrite";
import { config } from "@/app/config/index";
import { Query } from "node-appwrite";
import type { Member, Static } from "@/app/types";
import { checkAccess } from "@/app/lib/access-control";

const BATCH_SIZE = 100;

// Helper function to fetch all statics
async function fetchAllStatics(preset: string) {
  const collectionId =
    preset === "preset1"
      ? config.appwrite.staticsCollectionId
      : config.appwrite.staticsPreset2CollectionId;

  const countResponse = await databases.listDocuments(
    config.appwrite.databaseId,
    collectionId,
    [Query.limit(1)]
  );
  const total = countResponse.total;

  const batches = Math.ceil(total / BATCH_SIZE);
  const allStatics = [];

  for (let i = 0; i < batches; i++) {
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      collectionId,
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

// Helper function to fetch all members
async function fetchAllMembers() {
  const countResponse = await databases.listDocuments(
    config.appwrite.databaseId,
    config.appwrite.collectionId,
    [Query.limit(1)]
  );
  const total = countResponse.total;

  const batches = Math.ceil(total / BATCH_SIZE);
  const allMembers = [];

  for (let i = 0; i < batches; i++) {
    const response = await databases.listDocuments(
      config.appwrite.databaseId,
      config.appwrite.collectionId,
      [Query.limit(BATCH_SIZE), Query.offset(i * BATCH_SIZE)]
    );
    allMembers.push(...response.documents);
  }

  return allMembers;
}

// Helper function to create Discord embed for all static groups
function createStaticGroupEmbed(
  groupedStatics: Map<number, Member[]>,
  guild: string
): any {
  // Create fields for all 12 groups, even empty ones
  const fields = Array.from({ length: 12 }, (_, i) => {
    const groupNumber = i + 1;
    const members = groupedStatics.get(groupNumber) || [];

    // Format member list, or show "Empty" if no members
    const memberList =
      members.length > 0
        ? members
            .map(
              (member) =>
                member.ingame_name ||
                member.discord_nickname ||
                member.discord_username
            )
            .join("\n")
        : "Empty";

    return {
      name: `__Group ${groupNumber}__`,
      value: memberList,
      inline: true,
    };
  });

  return {
    title: `Static Groups - ${guild}`,
    fields,
    color: 0x004499, // Green color
    timestamp: new Date().toISOString(),
    footer: {
      text: "Last Updated",
    },
  };
}

// Helper function to get webhook URL for a guild
function getWebhookUrl(guild: string): string | null {
  const guildEntries = Object.entries(config.discord.guilds);
  const guildEntry = guildEntries.find(([_, name]) => name === guild);

  if (guildEntry) {
    const [guildKey] = guildEntry;
    return (
      config.discord.webhooks[
        guildKey as keyof typeof config.discord.webhooks
      ] || null
    );
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkAccess.isLeadership(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { guild, preset = "preset1" } = await request.json();

    if (!guild) {
      return NextResponse.json({ error: "Missing guild" }, { status: 400 });
    }

    const webhookUrl = getWebhookUrl(guild);
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "No webhook configured for this guild" },
        { status: 400 }
      );
    }

    // Fetch all statics and members
    const [staticsResponse, membersResponse] = await Promise.all([
      fetchAllStatics(preset),
      fetchAllMembers(),
    ]);

    // Convert raw documents to proper types
    const statics = staticsResponse.map(
      (doc) =>
        ({
          discord_id: doc.discord_id,
          group: parseInt(doc.group),
        } as Static)
    );

    const members = membersResponse.map(
      (doc) =>
        ({
          $id: doc.$id,
          discord_id: doc.discord_id,
          discord_username: doc.discord_username,
          discord_nickname: doc.discord_nickname,
          ingame_name: doc.ingame_name,
          guild: doc.guild,
          primary_weapon: doc.primary_weapon,
          secondary_weapon: doc.secondary_weapon,
          has_thread: doc.has_thread,
          class: doc.class,
        } as Member)
    );

    // Filter members by guild and create a lookup map
    const guildMembers = members.filter((m) => m.guild === guild);
    const memberMap = new Map(guildMembers.map((m) => [m.discord_id, m]));

    // Group statics by group number
    const groupedStatics = new Map<number, Member[]>();
    statics.forEach((static_) => {
      if (static_.group) {
        const member = memberMap.get(static_.discord_id);
        if (member && member.guild === guild) {
          const groupMembers = groupedStatics.get(static_.group) || [];
          groupMembers.push(member);
          groupedStatics.set(static_.group, groupMembers);
        }
      }
    });

    // Create a single embed for all groups
    const presetName = preset === "preset1" ? "Preset 1" : "Preset 2";
    const embed = createStaticGroupEmbed(
      groupedStatics,
      `${guild} - ${presetName}`
    );

    // Send the embed to Discord webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send to Discord webhook");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending statics to Discord:", error);
    return NextResponse.json(
      { error: "Failed to send statics to Discord" },
      { status: 500 }
    );
  }
}
