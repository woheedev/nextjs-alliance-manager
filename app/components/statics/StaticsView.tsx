"use client";

import { useState, useCallback } from "react";
import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  SegmentedControl,
  Grid,
} from "@mantine/core";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { StaticGroup } from "./StaticGroup";
import { MemberList } from "./MemberList";
import type { Member, Static } from "@/app/types";
import { checkAccess } from "@/app/lib/access-control";
import { useAuth } from "@/app/hooks/useAuth";
import { CLASS_COLORS } from "@/app/types/classes";

interface StaticsViewProps {
  members: Member[];
  statics: Static[];
}

const GUILDS = ["Guild A", "Guild B"]; // Replace with actual guild names

export function StaticsView({ members, statics }: StaticsViewProps) {
  const { user } = useAuth();
  const [selectedGuild, setSelectedGuild] = useState(GUILDS[0]);
  const [updatingMembers, setUpdatingMembers] = useState<Set<string>>(
    new Set()
  );

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    try {
      setUpdatingMembers((prev) => new Set(prev).add(draggableId));

      const response = await fetch("/api/statics/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          discordId: draggableId,
          group:
            destination.droppableId === "members"
              ? null
              : parseInt(destination.droppableId.split("-")[1]),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update static group");
      }
    } catch (error) {
      console.error("Failed to update static group:", error);
    } finally {
      setUpdatingMembers((prev) => {
        const next = new Set(prev);
        next.delete(draggableId);
        return next;
      });
    }
  }, []);

  // Add access check after hooks
  if (!user || !checkAccess.isMaster(user)) return null;

  return (
    <Container fluid>
      <Stack gap="md">
        <Paper p="md" withBorder>
          <Group justify="space-between" align="center">
            <Title order={2}>Static Groups</Title>
            <SegmentedControl
              data={GUILDS.map((guild) => ({ label: guild, value: guild }))}
              value={selectedGuild}
              onChange={setSelectedGuild}
            />
          </Group>
        </Paper>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid>
            <Grid.Col span={3}>
              <MemberList
                members={members.filter((m) => m.guild === selectedGuild)}
                updatingMembers={updatingMembers}
                classColors={CLASS_COLORS}
              />
            </Grid.Col>
            <Grid.Col span={9}>
              <Grid>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Grid.Col key={i} span={4}>
                    <StaticGroup
                      group={i + 1}
                      members={statics.filter((s) => s.group === i + 1)}
                      updatingMembers={updatingMembers}
                      classColors={CLASS_COLORS}
                      selectedGuild={selectedGuild}
                    />
                  </Grid.Col>
                ))}
              </Grid>
            </Grid.Col>
          </Grid>
        </DragDropContext>
      </Stack>
    </Container>
  );
}
