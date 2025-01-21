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

interface StaticsViewProps {
  members: Member[];
  statics: Static[];
}

const GUILDS = ["Guild A", "Guild B"]; // Replace with actual guild names

export function StaticsView({ members, statics }: StaticsViewProps) {
  const [selectedGuild, setSelectedGuild] = useState(GUILDS[0]);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    try {
      setIsUpdating(true);

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

      // Optimistically update UI
      // You would need to implement this based on your data structure
    } catch (error) {
      console.error("Failed to update static group:", error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

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
                isUpdating={isUpdating}
              />
            </Grid.Col>
            <Grid.Col span={9}>
              <Grid>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Grid.Col key={i} span={4}>
                    <StaticGroup
                      group={i + 1}
                      members={statics.filter((s) => s.group === i + 1)}
                      isUpdating={isUpdating}
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
