"use client";

import { useState, useEffect } from "react";
import { Stack, SegmentedControl, Grid, Group } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useAllData } from "@/app/hooks/useAllData";
import { LoadingOverlay } from "@/app/components/common/LoadingOverlay";
import { useAccess } from "@/app/hooks/useAccess";
import { AccessRules } from "@/app/lib/access-control";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { MemberList } from "@/app/components/statics/MemberList";
import { StaticGroup } from "@/app/components/statics/StaticGroup";
import type { Member, Static, AllData } from "@/app/types";
import { CLASS_COLORS, CLASS_ORDER } from "@/app/types/classes";
import { WebhookButton } from "@/app/components/statics/WebhookButton";

// Helper function to sort members by class order and then alphabetically
const sortMembersByClass = (members: Member[]) => {
  return [...members].sort((a, b) => {
    const aIndex = CLASS_ORDER.indexOf(a.class || "NO_CLASS");
    const bIndex = CLASS_ORDER.indexOf(b.class || "NO_CLASS");

    // First sort by class order
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // Then sort alphabetically within the same class
    const aName = (a.ingame_name || a.discord_nickname || "").toLowerCase();
    const bName = (b.ingame_name || b.discord_nickname || "").toLowerCase();
    return aName.localeCompare(bName);
  });
};

// Helper function to get max members in a row
const getMaxMembersInRow = (
  groups: Member[][],
  rowStart: number,
  groupsPerRow: number
) => {
  let max = 0;
  for (
    let i = rowStart;
    i < rowStart + groupsPerRow && i < groups.length;
    i++
  ) {
    max = Math.max(max, groups[i]?.length || 0);
  }
  return max;
};

export default function StaticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useAccess(
    AccessRules.leadership
  );
  const {
    data: initialData,
    loading: dataLoading,
    error,
    mutate,
  } = useAllData();
  const [data, setData] = useState<AllData | null>(initialData);
  const [selectedGuild, setSelectedGuild] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [updatingMembers, setUpdatingMembers] = useState<Set<string>>(
    new Set()
  );
  const [groupsPerRow, setGroupsPerRow] = useState(3); // Default to 3

  // Update local data when initialData changes, but only if we don't have data yet
  useEffect(() => {
    if (initialData && !data) {
      setData(initialData);
    }
  }, [initialData, data]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set initial guild when data loads
  useEffect(() => {
    const guilds = data?.uniqueValues?.guilds;
    if (guilds && guilds.length > 0 && !selectedGuild) {
      setSelectedGuild(guilds[0]);
    }
  }, [data?.uniqueValues?.guilds, selectedGuild]);

  // Handle window resize
  useEffect(() => {
    const updateGroupsPerRow = () => {
      if (window.innerWidth >= 992) {
        setGroupsPerRow(3); // md breakpoint
      } else if (window.innerWidth >= 768) {
        setGroupsPerRow(2); // sm breakpoint
      } else {
        setGroupsPerRow(1); // mobile
      }
    };

    // Set initial value
    updateGroupsPerRow();

    // Add resize listener
    window.addEventListener("resize", updateGroupsPerRow);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateGroupsPerRow);
    };
  }, []);

  // Only show loading overlay on initial load
  if (!mounted) return null;
  if ((accessLoading || dataLoading) && !data) return <LoadingOverlay />;
  if (!hasAccess) {
    router.push("/");
    return null;
  }
  if (!data) return null;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !data) return;

    const { source, destination, draggableId } = result;

    // Skip update if dragging within the same list
    if (
      source.droppableId === destination.droppableId ||
      (source.droppableId === "member-list" &&
        destination.droppableId === "member-list")
    ) {
      return;
    }

    setUpdatingMembers((prev) => new Set(prev).add(draggableId));

    try {
      if (
        source.droppableId !== "member-list" ||
        (destination.droppableId !== "member-list" &&
          destination.droppableId !== source.droppableId)
      ) {
        const group =
          destination.droppableId === "member-list"
            ? null
            : parseInt(destination.droppableId.split("-")[1]) + 1;

        // Optimistically update the UI by updating local state
        const updatedStatics = data.statics.filter(
          (s: Static) => s.discord_id !== draggableId
        );
        if (group !== null) {
          // Find the member data to include in the static
          const memberData = data.members.find(
            (m) => m.discord_id === draggableId
          );
          updatedStatics.push({
            ...memberData, // Include all member data
            discord_id: draggableId,
            group,
          } as Static);
        }

        // Update local state immediately
        setData((currentData) => {
          if (!currentData) return null;
          return {
            ...currentData,
            statics: updatedStatics,
          };
        });

        // Make API call in background
        const response = await fetch("/api/statics/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            discordId: draggableId,
            group,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update static group");
        }

        // Quietly revalidate in the background after successful update
        setTimeout(() => mutate(), 1000);
      }
    } catch (error) {
      // On error, revert the optimistic update by revalidating
      mutate();
      // Optionally show an error toast/notification here
    } finally {
      setUpdatingMembers((prev) => {
        const next = new Set(prev);
        next.delete(draggableId);
        return next;
      });
    }
  };

  // Filter members by selected guild
  const guildMembers = data.members.filter(
    (m: Member) => m.guild === selectedGuild
  );
  const staticMembers = data.statics.filter((s: Static) =>
    guildMembers.some((m: Member) => m.discord_id === s.discord_id)
  );

  // Get members not in statics
  const membersInStatics = new Set(
    staticMembers.map((s: Static) => s.discord_id)
  );
  const availableMembers = sortMembersByClass(
    guildMembers.filter((m: Member) => !membersInStatics.has(m.discord_id))
  );

  // Group members by static group
  const groupedMembers = Array.from({ length: 12 }, (_, i) =>
    guildMembers.filter((m: Member) =>
      staticMembers.find(
        (s: Static) => s.discord_id === m.discord_id && s.group === i + 1
      )
    )
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <SegmentedControl
          data={data.uniqueValues.guilds.map((guild: string) => ({
            label: guild,
            value: guild,
          }))}
          value={selectedGuild}
          onChange={setSelectedGuild}
        />
        <WebhookButton selectedGuild={selectedGuild} />
      </Group>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ position: "relative" }}>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
              <MemberList
                members={availableMembers}
                updatingMembers={updatingMembers}
                classColors={CLASS_COLORS}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
              <Grid>
                {Array.from({ length: 12 }, (_, i) => {
                  const rowIndex = Math.floor(i / groupsPerRow);
                  const rowMaxMembers = getMaxMembersInRow(
                    groupedMembers,
                    rowIndex * groupsPerRow,
                    groupsPerRow
                  );

                  return (
                    <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4 }}>
                      <StaticGroup
                        group={i + 1}
                        members={sortMembersByClass(groupedMembers[i])}
                        updatingMembers={updatingMembers}
                        classColors={CLASS_COLORS}
                        selectedGuild={selectedGuild}
                        rowMaxMembers={rowMaxMembers}
                      />
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Grid.Col>
          </Grid>
        </div>
      </DragDropContext>
    </Stack>
  );
}
