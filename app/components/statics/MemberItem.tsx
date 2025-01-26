import { Box, Group, Text, Badge } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { Draggable } from "@hello-pangea/dnd";
import type { MemberItemProps } from "@/app/types/components";

export function MemberItem({
  member,
  index,
  updatingMembers = new Set<string>(),
  classColors,
}: MemberItemProps) {
  const hasClass = member.class && member.class in classColors;
  const classColor = hasClass ? classColors[member.class!] : "gray";
  const badgeText = hasClass
    ? `${member.primary_weapon || "?"}/${member.secondary_weapon || "?"}`
    : "NO_CLASS";

  return (
    <Draggable
      draggableId={member.discord_id}
      index={index}
      isDragDisabled={updatingMembers.has(member.discord_id)}
    >
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            width: snapshot.isDragging
              ? (provided.draggableProps.style as any).width
              : "100%",
            zIndex: snapshot.isDragging ? 1000 : undefined,
          }}
        >
          <Group
            p={4}
            align="center"
            justify="space-between"
            wrap="nowrap"
            style={{
              borderRadius: "4px",
              border: "1px solid #333",
              backgroundColor: snapshot.isDragging ? "#2C2E33" : "#1A1B1E",
              minHeight: "28px",
              width: "100%",
              opacity: updatingMembers.has(member.discord_id) ? 0.7 : 1,
            }}
          >
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Box style={{ display: "flex", alignItems: "center" }}>
                <IconGripVertical size={16} style={{ opacity: 0.5 }} />
              </Box>
              <Text size="sm" truncate style={{ lineHeight: 1 }}>
                {member.ingame_name || member.discord_nickname}
              </Text>
            </Group>
            <Badge
              size="sm"
              color={classColor}
              variant={hasClass ? "filled" : "light"}
              style={{
                minWidth: "auto",
                padding: "0 4px",
                height: "18px",
                opacity: updatingMembers.has(member.discord_id) ? 0.7 : 1,
                flexShrink: 0,
              }}
            >
              {badgeText}
            </Badge>
          </Group>
        </Box>
      )}
    </Draggable>
  );
}
