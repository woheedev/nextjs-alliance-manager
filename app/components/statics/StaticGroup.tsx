import { Box, Group, Text, Badge, Stack } from "@mantine/core";
import { Droppable } from "@hello-pangea/dnd";
import { MemberItem } from "./MemberItem";
import type { StaticGroupProps } from "@/app/types/components";

export function StaticGroup({
  group,
  members,
  updatingMembers = new Set<string>(),
  classColors,
  selectedGuild,
  rowMaxMembers = 0,
}: StaticGroupProps) {
  const maxMembers = 6;
  const isFull = members.length >= maxMembers;
  // Calculate height based on actual content: 28px per item + 4px gap + padding
  const itemHeight = 28; // height of each member item
  const gap = 4; // gap between items
  const padding = 12; // total vertical padding (6px top + 6px bottom)
  const minHeight = Math.max(rowMaxMembers, 1) * (itemHeight + gap) + padding;

  return (
    <Box
      p="sm"
      style={{
        border: "1px solid #333",
        borderRadius: "8px",
        backgroundColor: "#25262B",
      }}
    >
      <Group justify="space-between" mb={4}>
        <Text fw={500} size="sm" c="dimmed">
          Group {group}
        </Text>
        {isFull && (
          <Badge size="sm" color="red">
            Full
          </Badge>
        )}
      </Group>

      <Droppable
        droppableId={`${selectedGuild}/group-${group - 1}`}
        isDropDisabled={isFull || updatingMembers.size > 0}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              backgroundColor: isFull
                ? "#1f1f1f"
                : snapshot.isDraggingOver
                ? "#2C2E33"
                : "#1a1a1a",
              borderRadius: "4px",
              transition: "background-color 0.2s ease",
              padding: "6px",
              opacity: isFull ? 0.8 : 1,
              minHeight: `${minHeight}px`,
            }}
          >
            <Stack gap={4}>
              {members.map((member, index) => (
                <MemberItem
                  key={member.discord_id}
                  member={member}
                  index={index}
                  updatingMembers={updatingMembers}
                  classColors={classColors}
                />
              ))}
            </Stack>
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </Box>
  );
}
