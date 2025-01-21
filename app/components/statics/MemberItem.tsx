import { Paper, Text, Group, Badge } from "@mantine/core";
import { Draggable, DraggableProvided } from "@hello-pangea/dnd";
import type { MemberItemProps } from "@/app/types/components";

export function MemberItem({
  member,
  index,
  isUpdateInProgress,
}: MemberItemProps) {
  return (
    <Draggable
      draggableId={member.discord_id}
      index={index}
      isDragDisabled={isUpdateInProgress}
    >
      {(provided: DraggableProvided) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          withBorder
          p="xs"
          mb="xs"
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" truncate>
              {member.discord_username}
            </Text>
            <Group gap={4}>
              <Badge size="sm" variant="light">
                {member.primary_weapon}
              </Badge>
              <Badge size="sm" variant="outline">
                {member.secondary_weapon}
              </Badge>
            </Group>
          </Group>
        </Paper>
      )}
    </Draggable>
  );
}
