import { Paper, Text, Stack } from "@mantine/core";
import { Droppable, DroppableProvided } from "@hello-pangea/dnd";
import { MemberItem } from "./MemberItem";
import type { Member } from "@/app/types";

interface MemberListProps {
  members: Member[];
  isUpdating: boolean;
}

export function MemberList({ members, isUpdating }: MemberListProps) {
  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Text fw={500}>Available Members</Text>
        <Droppable droppableId="members">
          {(provided: DroppableProvided) => (
            <Paper
              ref={provided.innerRef}
              {...provided.droppableProps}
              withBorder
              p="xs"
              style={{ minHeight: 400 }}
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
