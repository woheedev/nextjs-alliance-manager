import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Button,
  Group,
  Badge,
  SegmentedControl,
  Grid,
  Box,
  Card,
  ScrollArea,
  Loader,
  LoadingOverlay,
} from "@mantine/core";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { hasMasterRole } from "../lib/auth";
import { IconLogout, IconUsers, IconGripVertical } from "@tabler/icons-react";
import PropTypes from "prop-types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useData } from "../lib/DataContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.PROD
  ? ""
  : `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 6543}`;

// Class color mapping
const CLASS_COLORS = {
  Tank: "blue",
  Ranged: "yellow",
  Healer: "pink",
  Bomber: "green",
  Melee: "orange",
};

// Class order for sorting (index = priority)
const CLASS_ORDER = ["Tank", "Melee", "Ranged", "Bomber", "Healer", "NO_CLASS"];

// Helper function to sort members by class order and then alphabetically
const sortMembersByClass = (members) => {
  return [...members].sort((a, b) => {
    const aIndex = CLASS_ORDER.indexOf(a.class || "NO_CLASS");
    const bIndex = CLASS_ORDER.indexOf(b.class || "NO_CLASS");

    // First sort by class order
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // Then sort alphabetically within the same class
    const aName = (a.ingame_name || a.discord_nickname || "").toLowerCase();
    const bName = (b.ingame_name || b.discord_nickname || "").toLowerCase();
    return aName.localeCompare(bName);
  });
};

function MemberItem({ member, index, isLoading, isUpdateInProgress }) {
  const hasClass = member.class && CLASS_COLORS[member.class];
  const classColor = hasClass ? CLASS_COLORS[member.class] : "gray";

  const badgeText = hasClass
    ? `${member.primary_weapon || "?"}/${member.secondary_weapon || "?"}`
    : "NO_CLASS";

  return (
    <Draggable
      draggableId={member.discord_id}
      index={index}
      isDragDisabled={isLoading || isUpdateInProgress}
    >
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: snapshot.isDragging ? "#2C2E33" : undefined,
            opacity: isLoading || isUpdateInProgress ? 0.7 : 1,
            cursor: isLoading || isUpdateInProgress ? "not-allowed" : "default",
            width: snapshot.isDragging ? "auto" : "100%",
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
              width: snapshot.isDragging ? "auto" : "100%",
              maxWidth: snapshot.isDragging ? "300px" : "none",
            }}
          >
            <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Box
                {...provided.dragHandleProps}
                style={{
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {isLoading ? (
                  <Loader size="xs" />
                ) : (
                  <IconGripVertical
                    size={14}
                    style={{
                      color: isUpdateInProgress ? "#444" : "#666",
                      cursor: isUpdateInProgress ? "not-allowed" : "grab",
                    }}
                  />
                )}
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
                opacity: isUpdateInProgress ? 0.7 : 1,
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

MemberItem.propTypes = {
  member: PropTypes.shape({
    discord_id: PropTypes.string.isRequired,
    ingame_name: PropTypes.string,
    discord_nickname: PropTypes.string,
    guild: PropTypes.string,
    primary_weapon: PropTypes.string,
    secondary_weapon: PropTypes.string,
    class: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  isUpdateInProgress: PropTypes.bool,
};

function StaticGroup({
  groupId,
  members,
  updatingMembers,
  isUpdateInProgress,
}) {
  // Calculate dynamic height based on number of members
  const baseHeight = 40; // Reduced from 50 to give more space for members
  const memberHeight = 28; // Height of each member item
  const gap = 6; // Gap between members
  const padding = 8; // Padding inside the droppable area
  const maxMembers = 6;
  const isFull = members.length >= maxMembers;

  const minHeight = 120; // Minimum height when empty or few members
  const calculatedHeight =
    baseHeight + members.length * (memberHeight + gap) + padding * 2;
  const height = Math.max(minHeight, calculatedHeight);

  return (
    <Card
      withBorder
      shadow="sm"
      padding="sm"
      style={{
        height,
        opacity: isUpdateInProgress ? 0.8 : 1,
        cursor: isUpdateInProgress ? "not-allowed" : "default",
      }}
    >
      <Group justify="space-between" mb={4}>
        <Text fw={500} size="sm" c="dimmed">
          Group {parseInt(groupId.split("-")[1]) + 1}
        </Text>
        {isFull && (
          <Badge size="sm" color="red">
            Full
          </Badge>
        )}
      </Group>
      <Droppable
        droppableId={groupId}
        isDropDisabled={isFull || isUpdateInProgress}
      >
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              height: "calc(100% - 24px)", // Adjusted to account for reduced header space
              backgroundColor: isFull
                ? "#1f1f1f"
                : snapshot.isDraggingOver
                ? "#2C2E33"
                : "#1a1a1a",
              borderRadius: "4px",
              transition: "background-color 0.2s ease",
              padding: "6px", // Reduced padding to give more space
              opacity: isFull ? 0.8 : 1,
            }}
          >
            <Stack gap={4}>
              {members.map((member, index) => (
                <MemberItem
                  key={member.discord_id}
                  member={member}
                  index={index}
                  isLoading={updatingMembers.has(member.discord_id)}
                  isUpdateInProgress={isUpdateInProgress}
                />
              ))}
            </Stack>
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </Card>
  );
}

StaticGroup.propTypes = {
  groupId: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      discord_id: PropTypes.string.isRequired,
      ingame_name: PropTypes.string,
      discord_nickname: PropTypes.string,
    })
  ).isRequired,
  updatingMembers: PropTypes.instanceOf(Set).isRequired,
  isUpdateInProgress: PropTypes.bool,
};

function Statics() {
  const { allMembers, uniqueValues, statics, user, logout } = useData();
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [updatingMembers, setUpdatingMembers] = useState(new Set());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Add column count state and resize handler
  const getColumnCount = () => {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1200) return 2;
    return 3;
  };

  const [columnCount, setColumnCount] = useState(getColumnCount());

  // Update column count on window resize
  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Process guilds (static data)
  const { data: guildsData } = useQuery({
    queryKey: ["staticGuilds", uniqueValues],
    queryFn: () => uniqueValues.guilds || [],
    enabled: uniqueValues.guilds.length > 0,
  });

  // Set initial selected guild when guilds data is loaded
  useEffect(() => {
    if (!selectedGuild && guildsData?.length > 0) {
      setSelectedGuild(guildsData[0]);
    }
  }, [selectedGuild, guildsData]);

  // Process members and groups (dynamic data)
  const { data: processedData } = useQuery({
    queryKey: ["processedGroups", allMembers, statics, selectedGuild],
    queryFn: () => {
      // Create member map first for O(1) lookups
      const memberMap = new Map(allMembers.map((m) => [m.discord_id, m]));

      // Track assigned members to prevent duplicates
      const assignedMembers = new Set();

      // Process static groups first
      const groupsByGuild = {};
      statics.forEach((staticMember) => {
        const member = memberMap.get(staticMember.discord_id);
        if (member) {
          const guild = member.guild || "No Guild";
          if (!groupsByGuild[guild]) {
            groupsByGuild[guild] = {};
          }
          const groupKey = `group-${staticMember.group - 1}`;
          if (!groupsByGuild[guild][groupKey]) {
            groupsByGuild[guild][groupKey] = [];
          }
          groupsByGuild[guild][groupKey].push(member);
          assignedMembers.add(member.discord_id);
        }
      });

      // Group remaining members by guild
      const membersByGuild = allMembers.reduce((acc, member) => {
        if (!assignedMembers.has(member.discord_id)) {
          const guild = member.guild || "No Guild";
          if (!acc[guild]) {
            acc[guild] = [];
          }
          acc[guild].push(member);
        }
        return acc;
      }, {});

      // Sort members within each guild
      Object.keys(membersByGuild).forEach((guild) => {
        membersByGuild[guild] = sortMembersByClass(membersByGuild[guild]);
      });

      // Initialize empty groups for selected guild
      if (selectedGuild) {
        if (!groupsByGuild[selectedGuild]) {
          groupsByGuild[selectedGuild] = {};
        }
        for (let i = 0; i < 12; i++) {
          const groupKey = `group-${i}`;
          if (!groupsByGuild[selectedGuild][groupKey]) {
            groupsByGuild[selectedGuild][groupKey] = [];
          }
          // Sort members within groups
          else {
            groupsByGuild[selectedGuild][groupKey] = sortMembersByClass(
              groupsByGuild[selectedGuild][groupKey]
            );
          }
        }
      }

      return {
        membersByGuild,
        groupsByGuild,
        memberMap,
      };
    },
    enabled: allMembers.length > 0 && !!selectedGuild,
  });

  // Update static group mutation with optimistic updates
  const updateStaticMutation = useMutation({
    mutationFn: async ({ discordId, group }) => {
      const response = await fetch(`${API_URL}/api/statics/update`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId, group }),
      });
      if (!response.ok) throw new Error("Failed to update static group");
      return response.json();
    },
    onMutate: async ({ discordId, group }) => {
      await queryClient.cancelQueries({ queryKey: ["allData"] });
      const previousData = queryClient.getQueryData(["allData"]);

      // Optimistically update the statics
      queryClient.setQueryData(["allData"], (old) => {
        if (!old) return previousData;

        const newStatics = old.statics.filter(
          (s) => s.discord_id !== discordId
        );
        if (group !== null) {
          newStatics.push({ discord_id: discordId, group });
        }
        return { ...old, statics: newStatics };
      });

      // Also update the processed groups cache
      queryClient.setQueryData(
        ["processedGroups", allMembers, statics, selectedGuild],
        (old) => {
          if (!old) return;

          const member = old.memberMap.get(discordId);
          if (!member) return old;

          const newData = {
            ...old,
            membersByGuild: { ...old.membersByGuild },
            groupsByGuild: { ...old.groupsByGuild },
          };

          // Remove from current location
          if (group === null) {
            // Remove from group and add to member list
            Object.values(newData.groupsByGuild[selectedGuild] || {}).forEach(
              (groupMembers) => {
                const index = groupMembers.findIndex(
                  (m) => m.discord_id === discordId
                );
                if (index !== -1) {
                  groupMembers.splice(index, 1);
                }
              }
            );
            if (!newData.membersByGuild[selectedGuild]) {
              newData.membersByGuild[selectedGuild] = [];
            }
            newData.membersByGuild[selectedGuild].push(member);
            newData.membersByGuild[selectedGuild] = sortMembersByClass(
              newData.membersByGuild[selectedGuild]
            );
          } else {
            // Remove from member list
            if (newData.membersByGuild[selectedGuild]) {
              newData.membersByGuild[selectedGuild] = newData.membersByGuild[
                selectedGuild
              ].filter((m) => m.discord_id !== discordId);
            }
            // Add to group
            const groupKey = `group-${group - 1}`;
            if (!newData.groupsByGuild[selectedGuild][groupKey]) {
              newData.groupsByGuild[selectedGuild][groupKey] = [];
            }
            newData.groupsByGuild[selectedGuild][groupKey].push(member);
            newData.groupsByGuild[selectedGuild][groupKey] = sortMembersByClass(
              newData.groupsByGuild[selectedGuild][groupKey]
            );
          }

          return newData;
        }
      );

      setUpdatingMembers((prev) => new Set(prev).add(discordId));
      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error("[Client ERROR] Error updating group:", err);
      if (context?.previousData) {
        queryClient.setQueryData(["allData"], context.previousData);
      }
      setUpdatingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.discordId);
        return newSet;
      });
    },
    onSettled: (_, __, { discordId }) => {
      setUpdatingMembers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
      // Invalidate queries but don't refetch immediately
      queryClient.invalidateQueries({ queryKey: ["allData"] });
      queryClient.invalidateQueries({
        queryKey: ["processedGroups", allMembers, statics, selectedGuild],
      });
    },
  });

  // Check master role access
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!hasMasterRole(user.roles)) {
      console.log("[Client] User lacks Master role, redirecting");
      navigate("/");
      return;
    }

    console.log("[Client] User has Master role, proceeding");
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // Moving to a group
    if (sourceId === "member-list") {
      const [guild, groupId] = destId.split("/");
      if (
        guild === selectedGuild &&
        processedData?.groupsByGuild[guild]?.[groupId]
      ) {
        const memberToMove =
          processedData.membersByGuild[selectedGuild][source.index];
        if (!memberToMove) return;

        const groupNumber = parseInt(groupId.split("-")[1]);
        if (processedData.groupsByGuild[guild][groupId].length < 6) {
          updateStaticMutation.mutate({
            discordId: memberToMove.discord_id,
            group: groupNumber + 1,
          });
        }
      }
    }
    // Moving back to member list
    else if (destId === "member-list") {
      const [sourceGuild, sourceGroupId] = sourceId.split("/");
      if (sourceGuild === selectedGuild) {
        const memberToMove =
          processedData.groupsByGuild[sourceGuild][sourceGroupId][source.index];
        if (!memberToMove) return;

        updateStaticMutation.mutate({
          discordId: memberToMove.discord_id,
          group: null,
        });
      }
    }
    // Moving between groups
    else if (sourceId !== destId) {
      const [sourceGuild, sourceGroupId] = sourceId.split("/");
      const [destGuild, destGroupId] = destId.split("/");

      if (sourceGuild === destGuild && sourceGuild === selectedGuild) {
        const memberToMove =
          processedData.groupsByGuild[sourceGuild][sourceGroupId][source.index];
        if (!memberToMove) return;

        const destGroupNumber = parseInt(destGroupId.split("-")[1]);
        if (processedData.groupsByGuild[destGuild][destGroupId].length < 6) {
          updateStaticMutation.mutate({
            discordId: memberToMove.discord_id,
            group: destGroupNumber + 1,
          });
        }
      }
    }
  };

  // Add a new state to track if any update is in progress
  const isUpdateInProgress = updatingMembers.size > 0;

  // Show loading overlay during initial data load
  if (!user || !guildsData || !processedData) {
    return (
      <Box pos="fixed" top={0} left={0} right={0} bottom={0} bg="dark.7">
        <LoadingOverlay
          visible={true}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
          loaderProps={{ size: "xl", color: "indigo" }}
        />
      </Box>
    );
  }

  // Show access denied message if no master role
  if (!hasMasterRole(user)) {
    return (
      <Container fluid p="md">
        <Stack align="center" gap="md">
          <Text>You need Master Access to view this page.</Text>
          <Button onClick={() => navigate("/")}>Return to VOD Tracker</Button>
        </Stack>
      </Container>
    );
  }

  // Get all members in groups for the selected guild
  const membersInGroups = new Set(
    Object.values(processedData?.groupsByGuild[selectedGuild] || {})
      .flat()
      .map((member) => member.discord_id)
  );

  // Filter out members that are already in groups
  const currentMembers = processedData
    ? sortMembersByClass(
        (processedData.membersByGuild[selectedGuild] || []).filter(
          (member) => !membersInGroups.has(member.discord_id)
        )
      )
    : [];
  const currentGroups = processedData
    ? processedData.groupsByGuild[selectedGuild] || {}
    : {};

  return (
    <Container fluid p="md">
      <Stack gap="md">
        <Paper p="md" withBorder shadow="sm">
          <Group justify="space-between" align="center">
            <Group>
              {hasMasterRole(user) && user.weaponPermissions?.length > 0 ? (
                <>
                  <Badge
                    variant="gradient"
                    gradient={{ from: "red", to: "green", deg: 90 }}
                    size="lg"
                    radius="md"
                  >
                    Master + Weapon Lead
                  </Badge>
                  <Button
                    component={Link}
                    to="/"
                    variant="subtle"
                    size="sm"
                    replace
                  >
                    VOD Tracker
                  </Button>
                </>
              ) : (
                <>
                  <Badge color="red" size="lg" radius="md">
                    Master Access
                  </Badge>
                  <Button
                    component={Link}
                    to="/"
                    variant="subtle"
                    size="sm"
                    replace
                  >
                    VOD Tracker
                  </Button>
                </>
              )}
            </Group>
            <Button
              onClick={handleLogout}
              variant="light"
              color="red"
              radius="md"
              leftSection={<IconLogout size={16} />}
            >
              Logout
            </Button>
          </Group>
        </Paper>

        {/* Guild Selection */}
        <Paper p="md" withBorder shadow="sm">
          <Stack align="center" gap="md">
            <Title order={2} size="h3">
              Guild Statics
            </Title>
            <ScrollArea w="100%" type="never">
              <SegmentedControl
                value={selectedGuild}
                onChange={setSelectedGuild}
                data={guildsData}
                size="sm"
                radius="md"
                fullWidth
                styles={{
                  root: {
                    background: "transparent",
                    "@media (max-width: 768px)": {
                      gap: 4,
                    },
                  },
                  control: {
                    "@media (max-width: 768px)": {
                      padding: "4px 8px",
                    },
                  },
                  label: {
                    "@media (max-width: 768px)": {
                      padding: "4px 8px",
                      fontSize: "12px",
                    },
                  },
                }}
              />
            </ScrollArea>
          </Stack>
        </Paper>

        {/* Main Content Area */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid gutter="md" style={{ minHeight: "calc(100vh - 300px)" }}>
            {/* Member List - Only hide on mobile */}
            <Grid.Col
              display={{ base: "none", sm: "block" }}
              span={{ sm: 2.4 }}
            >
              <Paper withBorder shadow="sm" h="100%">
                <Stack gap={0}>
                  <Box p="md" style={{ borderBottom: "1px solid #333" }}>
                    <Group gap="xs">
                      <IconUsers size={20} />
                      <Text fw={500}>Members ({currentMembers.length})</Text>
                    </Group>
                  </Box>
                  <ScrollArea h="calc(100vh - 360px)" p="xs">
                    <Droppable
                      droppableId="member-list"
                      isDropDisabled={isUpdateInProgress}
                    >
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            backgroundColor: snapshot.isDraggingOver
                              ? "#2C2E33"
                              : undefined,
                            borderRadius: "4px",
                            transition: "background-color 0.2s ease",
                            minHeight: "100%",
                            opacity: isUpdateInProgress ? 0.8 : 1,
                            cursor: isUpdateInProgress
                              ? "not-allowed"
                              : "default",
                          }}
                        >
                          <Stack gap="xs">
                            {currentMembers.map((member, index) => (
                              <MemberItem
                                key={member.discord_id}
                                member={member}
                                index={index}
                                isUpdateInProgress={isUpdateInProgress}
                              />
                            ))}
                          </Stack>
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </ScrollArea>
                </Stack>
              </Paper>
            </Grid.Col>

            {/* Groups Area - Full width on mobile */}
            <Grid.Col span={{ base: 12, sm: "auto" }}>
              <Paper withBorder shadow="sm" p="md">
                <Grid gutter={{ base: "xs", md: "md" }}>
                  {Array.from({ length: 12 }).map((_, index) => {
                    const groupId = `${selectedGuild}/group-${index}`;
                    return (
                      <Grid.Col
                        span={{ base: 12, sm: 12 / columnCount }}
                        key={groupId}
                      >
                        <StaticGroup
                          groupId={groupId}
                          members={currentGroups[`group-${index}`] || []}
                          updatingMembers={updatingMembers}
                          isUpdateInProgress={isUpdateInProgress}
                        />
                      </Grid.Col>
                    );
                  })}
                </Grid>
              </Paper>
            </Grid.Col>
          </Grid>
        </DragDropContext>
      </Stack>
    </Container>
  );
}

export default Statics;
