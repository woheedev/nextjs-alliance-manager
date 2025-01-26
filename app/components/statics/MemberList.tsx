import { Box, Stack, Text, Group } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { Droppable } from "@hello-pangea/dnd";
import { MemberItem } from "./MemberItem";
import type { MemberListProps } from "@/app/types/components";

export function MemberList({
  members,
  updatingMembers,
  classColors,
}: MemberListProps) {
  return (
    <Box
      p="md"
      style={{
        border: "1px solid #333",
        borderRadius: "8px",
        position: "sticky",
        top: "20px", // Adjust this value to control distance from top
        maxHeight: "calc(100vh - 40px)", // Adjust to prevent overflow
        overflowY: "auto",
      }}
    >
      <Group gap="xs" mb="md">
        <IconUsers size={20} />
        <Text fw={500}>Members ({members.length})</Text>
      </Group>

      <Droppable
        droppableId="member-list"
        isDropDisabled={updatingMembers.size > 0}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              backgroundColor: snapshot.isDraggingOver ? "#2C2E33" : undefined,
              borderRadius: "4px",
              transition: "background-color 0.2s ease",
              minHeight: "100px",
              opacity: updatingMembers.size > 0 ? 0.8 : 1,
              cursor: updatingMembers.size > 0 ? "not-allowed" : "default",
            }}
          >
            <Stack gap="xs">
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
