"use client";

import {
  Table,
  Badge,
  Checkbox,
  TextInput,
  Group,
  ActionIcon,
  Text,
  Tooltip,
  Box,
  LoadingOverlay,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import type { VodTableProps } from "@/app/types/components";
import { useAuth } from "@/app/hooks/useAuth";
import { formatDate } from "@/app/lib/utils";
import { checkAccess } from "@/app/lib/access-control";

export function VodTable({
  members,
  vodTracking,
  onVodCheck,
  onGearCheck,
  onNotesChange,
  onGearScoreChange,
  updatingVods,
  notesInput,
  gearScoreInput,
}: VodTableProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Box
      style={{ overflowX: "auto", position: "relative", minHeight: "200px" }}
    >
      <Table stickyHeader highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ whiteSpace: "nowrap" }}>
              Discord Username
            </Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>In-game Name</Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>Guild</Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>Primary</Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>Secondary</Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap", textAlign: "center" }}>
              Ticket
            </Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap", textAlign: "center" }}>
              VOD
            </Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>Checked</Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap", textAlign: "center" }}>
              Gear
            </Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>Checked</Table.Th>
            <Table.Th style={{ whiteSpace: "nowrap" }}>CP</Table.Th>
            <Table.Th style={{ width: "100%" }}>Notes</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {members.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={12}>
                <Box py="xl" ta="center">
                  <Text size="lg" fw={500} c="dimmed">
                    No results found
                  </Text>
                </Box>
              </Table.Td>
            </Table.Tr>
          ) : (
            members.map((member) => {
              const canEditVod = checkAccess.canEditWeapon(
                user,
                member.primary_weapon,
                member.secondary_weapon
              );

              return (
                <Table.Tr key={member.discord_id}>
                  <Table.Td>{member.discord_username}</Table.Td>
                  <Table.Td>{member.ingame_name}</Table.Td>
                  <Table.Td>{member.guild}</Table.Td>
                  <Table.Td>{member.primary_weapon}</Table.Td>
                  <Table.Td>{member.secondary_weapon}</Table.Td>
                  <Table.Td style={{ textAlign: "center" }}>
                    <Badge
                      color={member.has_thread ? "green" : "red"}
                      variant="filled"
                      radius="xl"
                      size="sm"
                      p={0}
                      w={20}
                      h={20}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {member.has_thread ? "✓" : "✕"}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "center" }}>
                    {updatingVods.has(member.discord_id) && (
                      <LoadingOverlay visible={true} />
                    )}
                    <Box style={{ display: "flex", justifyContent: "center" }}>
                      <Checkbox
                        checked={
                          vodTracking[member.discord_id]?.has_vod || false
                        }
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
                    </Box>
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    {vodTracking[member.discord_id]?.vod_check_date ? (
                      <Group gap="xs" wrap="nowrap">
                        <Tooltip
                          label={`Last checked by: ${
                            vodTracking[member.discord_id].vod_check_lead
                          }`}
                          position="top"
                          withArrow
                          color="dark"
                          openDelay={300}
                        >
                          <Text size="sm">
                            {formatDate(
                              vodTracking[member.discord_id].vod_check_date
                            )}
                          </Text>
                        </Tooltip>
                        {canEditVod && (
                          <Tooltip
                            label="Update check date"
                            position="top"
                            withArrow
                            color="dark"
                          >
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={() =>
                                onVodCheck(
                                  member.discord_id,
                                  true,
                                  member.primary_weapon,
                                  member.secondary_weapon
                                )
                              }
                              disabled={updatingVods.has(member.discord_id)}
                            >
                              <IconRefresh size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ) : null}
                  </Table.Td>
                  <Table.Td style={{ textAlign: "center" }}>
                    {updatingVods.has(member.discord_id) && (
                      <LoadingOverlay visible={true} />
                    )}
                    <Box style={{ display: "flex", justifyContent: "center" }}>
                      <Checkbox
                        checked={
                          vodTracking[member.discord_id]?.gear_checked || false
                        }
                        onChange={(e) =>
                          onGearCheck(
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
                    </Box>
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    {vodTracking[member.discord_id]?.gear_check_date ? (
                      <Group gap="xs" wrap="nowrap">
                        <Tooltip
                          label={`Last checked by: ${
                            vodTracking[member.discord_id].gear_check_lead
                          }`}
                          position="top"
                          withArrow
                          color="dark"
                          openDelay={300}
                        >
                          <Text size="sm">
                            {formatDate(
                              vodTracking[member.discord_id].gear_check_date
                            )}
                          </Text>
                        </Tooltip>
                        {canEditVod && (
                          <Tooltip
                            label="Update check date"
                            position="top"
                            withArrow
                            color="dark"
                          >
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={() =>
                                onGearCheck(
                                  member.discord_id,
                                  true,
                                  member.primary_weapon,
                                  member.secondary_weapon
                                )
                              }
                              disabled={updatingVods.has(member.discord_id)}
                            >
                              <IconRefresh size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ) : null}
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      value={
                        gearScoreInput[member.discord_id] ??
                        (vodTracking[member.discord_id]?.gear_score || "")
                      }
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        // Only allow numbers and max 4 digits
                        if (
                          (value === "" || /^\d+$/.test(value)) &&
                          value.length <= 4
                        ) {
                          onGearScoreChange(
                            member.discord_id,
                            value,
                            member.primary_weapon,
                            member.secondary_weapon
                          );
                        }
                      }}
                      disabled={!canEditVod}
                      w={60}
                      styles={{
                        input: {
                          textAlign: "center",
                        },
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    {vodTracking[member.discord_id]?.notes ? (
                      <Tooltip
                        label={
                          <Text
                            style={{
                              whiteSpace: "pre-wrap",
                              maxWidth: "300px",
                              maxHeight: "200px",
                              overflowY: "auto",
                            }}
                          >
                            {vodTracking[member.discord_id].notes}
                          </Text>
                        }
                        position="bottom"
                        multiline
                        withArrow
                        color="dark"
                        openDelay={300}
                      >
                        <TextInput
                          value={
                            notesInput[member.discord_id] ??
                            (vodTracking[member.discord_id]?.notes || "")
                          }
                          onChange={(e) =>
                            onNotesChange(
                              member.discord_id,
                              e.currentTarget.value,
                              member.primary_weapon,
                              member.secondary_weapon
                            )
                          }
                          disabled={!canEditVod}
                          styles={{
                            input: {
                              height: "36px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                            wrapper: {
                              width: "100%",
                            },
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <TextInput
                        value=""
                        onChange={(e) =>
                          onNotesChange(
                            member.discord_id,
                            e.currentTarget.value,
                            member.primary_weapon,
                            member.secondary_weapon
                          )
                        }
                        disabled={!canEditVod}
                        styles={{
                          input: {
                            height: "36px",
                          },
                          wrapper: {
                            width: "100%",
                          },
                        }}
                      />
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
