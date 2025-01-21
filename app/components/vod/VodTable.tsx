"use client";

import {
  Table,
  Badge,
  Checkbox,
  TextInput,
  Textarea,
  Group,
  ActionIcon,
  Text,
  Tooltip,
  LoadingOverlay,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type { VodTableProps } from "@/app/types/components";
import { hasWeaponLeadPermission } from "@/app/lib/auth";
import { useAuth } from "@/app/hooks/useAuth";
import { formatDate } from "@/app/lib/utils";

export function VodTable({
  members,
  vodTracking,
  onVodCheck,
  onGearCheck,
  onNotesChange,
  onGearScoreChange,
  updatingVods,
}: VodTableProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Table stickyHeader highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Discord Username</Table.Th>
          <Table.Th>In-game Name</Table.Th>
          <Table.Th>Guild</Table.Th>
          <Table.Th>Primary</Table.Th>
          <Table.Th>Secondary</Table.Th>
          <Table.Th>Ticket</Table.Th>
          <Table.Th>VOD</Table.Th>
          <Table.Th>Checked</Table.Th>
          <Table.Th>Gear</Table.Th>
          <Table.Th>Checked</Table.Th>
          <Table.Th>CP</Table.Th>
          <Table.Th>Notes</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {members.map((member) => {
          const canEditVod = hasWeaponLeadPermission(
            user,
            member.primary_weapon,
            member.secondary_weapon
          );

          return (
            <Table.Tr key={member.$id}>
              <Table.Td>{member.discord_username}</Table.Td>
              <Table.Td>{member.ingame_name}</Table.Td>
              <Table.Td>{member.guild}</Table.Td>
              <Table.Td>{member.primary_weapon}</Table.Td>
              <Table.Td>{member.secondary_weapon}</Table.Td>
              <Table.Td>
                <Badge
                  color={member.has_thread ? "green" : "red"}
                  variant="filled"
                  radius="xl"
                  size="sm"
                  p={0}
                  w={20}
                  h={20}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {member.has_thread ? "✓" : "✕"}
                </Badge>
              </Table.Td>
              <Table.Td style={{ position: "relative" }}>
                {updatingVods.has(member.discord_id) && (
                  <LoadingOverlay visible={true} />
                )}
                <Checkbox
                  checked={vodTracking[member.discord_id]?.has_vod || false}
                  onChange={(e) =>
                    onVodCheck(
                      member.discord_id,
                      e.currentTarget.checked,
                      member.primary_weapon,
                      member.secondary_weapon
                    )
                  }
                  disabled={
                    !member.has_thread ||
                    updatingVods.has(member.discord_id) ||
                    !canEditVod
                  }
                />
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  {vodTracking[member.discord_id]?.vod_check_date ? (
                    <Tooltip
                      label={`Last checked by: ${
                        vodTracking[member.discord_id].vod_check_lead
                      }`}
                      position="top"
                      withArrow
                      color="dark"
                    >
                      <Badge size="sm" variant="light" color="blue">
                        {formatDate(
                          vodTracking[member.discord_id].vod_check_date
                        )}
                      </Badge>
                    </Tooltip>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Never
                    </Text>
                  )}
                  {canEditVod && (
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() =>
                        onVodCheck(
                          member.discord_id,
                          true,
                          member.primary_weapon,
                          member.secondary_weapon
                        )
                      }
                      disabled={
                        updatingVods.has(member.discord_id) ||
                        !canEditVod ||
                        !member.has_thread ||
                        !vodTracking[member.discord_id]?.has_vod
                      }
                      title={
                        !vodTracking[member.discord_id]?.has_vod
                          ? "VOD must be checked first"
                          : "Update check date"
                      }
                    >
                      <IconRefresh size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
              {/* Similar structure for gear check columns */}
              <Table.Td>
                <TextInput
                  value={vodTracking[member.discord_id]?.gear_score ?? ""}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    if (/^\d{0,4}$/.test(value)) {
                      onGearScoreChange(
                        member.discord_id,
                        value,
                        member.primary_weapon,
                        member.secondary_weapon
                      );
                    }
                  }}
                  placeholder="CP"
                  disabled={
                    !member.has_thread ||
                    updatingVods.has(member.discord_id) ||
                    !canEditVod
                  }
                  maxLength={4}
                  w={75}
                  size="xs"
                />
              </Table.Td>
              <Table.Td>
                <Textarea
                  value={vodTracking[member.discord_id]?.notes ?? ""}
                  onChange={(e) => {
                    const notes = e.currentTarget.value.slice(0, 500);
                    if (
                      /^[a-zA-Z0-9\s.,!?@#$%&*()_+=\-[\]{}|:;<>/'"`~]*$/.test(
                        notes
                      )
                    ) {
                      onNotesChange(
                        member.discord_id,
                        notes,
                        member.primary_weapon,
                        member.secondary_weapon
                      );
                    }
                  }}
                  placeholder="Add notes..."
                  disabled={updatingVods.has(member.discord_id) || !canEditVod}
                  maxLength={500}
                  autosize
                  minRows={1}
                  maxRows={4}
                  size="xs"
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
