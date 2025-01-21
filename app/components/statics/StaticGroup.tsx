import { Paper, Text, Stack } from "@mantine/core";
import { Droppable, DroppableProvided } from "@hello-pangea/dnd";
import { MemberItem } from "./MemberItem";
import type { Static } from "@/app/types";

interface StaticGroupProps {
  group: number;
  members: Static[];
  isUpdating: boolean;
}

export function StaticGroup({ group, members, isUpdating }: StaticGroupProps) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Text fw={500}>Group {group}</Text>
        <Droppable droppableId={`group-${group}`}>
          {(provided: DroppableProvided) => (
            <Paper
              ref={provided.innerRef}
              {...provided.droppableProps}
              withBorder
              p="xs"
              style={{ minHeight: 100 }}
            >
              {members.map((member, index) => (
                <MemberItem
                  key={member.discord_id}
                  member={member}
                  index={index}
                  isUpdateInProgress={isUpdating}
                />
              ))}
              {provided.placeholder}
            </Paper>
          )}
        </Droppable>
      </Stack>
    </Paper>
  );
}
