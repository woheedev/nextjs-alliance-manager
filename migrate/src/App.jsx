import { useState, useEffect, useRef, useCallback, memo } from "react";
import Filters from "./components/Filters";
import {
  Container,
  Table,
  Text,
  Button,
  TextInput,
  Textarea,
  Checkbox,
  Badge,
  Paper,
  Group,
  Title,
  LoadingOverlay,
  ActionIcon,
  Box,
  Stack,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import { IconRefresh, IconLogout } from "@tabler/icons-react";
import { hasWeaponLeadPermission, hasMasterRole } from "./lib/auth";
import {
  getDiscordUrl,
  logout as discordLogout,
  exchangeCode,
} from "./lib/discord-auth";
import PropTypes from "prop-types";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useData } from "./lib/DataContext";

// In production, API calls will be made to the same domain
const API_URL = import.meta.env.PROD
  ? ""
  : `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 6543}`;

// Add login page component
const LoginPage = memo(({ onLogin }) => (
  <Stack h="100vh" justify="center" align="center" gap="lg">
    <Title>VOD Tracker</Title>
    <Text>Please log in with Discord to access the tool</Text>
    <Button onClick={onLogin} variant="filled" size="lg">
      Login with Discord
    </Button>
  </Stack>
));

LoginPage.displayName = "LoginPage";

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

// Add a helper function for date formatting at the top of the file
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}/${d
    .getFullYear()
    .toString()
    .slice(-2)}`;
};

// Add TableSkeleton component
const TableSkeleton = () => (
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
      {Array(10)
        .fill(0)
        .map((_, i) => (
          <Table.Tr key={i}>
            {Array(12)
              .fill(0)
              .map((_, j) => (
                <Table.Td key={j}>
                  <Skeleton
                    height={j === 11 ? 32 : 20}
                    width={j === 11 ? "100%" : j === 10 ? 75 : "100%"}
                  />
                </Table.Td>
              ))}
          </Table.Tr>
        ))}
    </Table.Tbody>
  </Table>
);

// Add OAuth Callback component
const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useData();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");

      if (!code) {
        setError("No authorization code received");
        return;
      }

      try {
        const data = await exchangeCode(code);
        setUser(data.user);
        navigate("/");
      } catch (err) {
        console.error("[Auth ERROR] Callback error:", err);
        setError(err.message || "Authentication failed");
      }
    };

    handleCallback();
  }, [location, navigate, setUser]);

  if (error) {
    return (
      <Stack h="100vh" justify="center" align="center" gap="lg">
        <Title order={2} color="red">
          Authentication Error
        </Title>
        <Text>{error}</Text>
        <Button onClick={() => navigate("/")} variant="filled" color="red">
          Return Home
        </Button>
      </Stack>
    );
  }

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
};

function App() {
  const {
    allMembers,
    uniqueValues,
    vodTracking,
    setVodTracking,
    user,
    authChecking,
    loading,
    isFetching,
    isError,
    error,
  } = useData();
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [hasAnyRole, setHasAnyRole] = useState(false);
  const [filters, setFilters] = useState({
    guild: "",
    primary_weapon: "",
    secondary_weapon: "",
    has_thread: "",
  });
  const [updatingVods, setUpdatingVods] = useState(new Set());
  const [notesInput, setNotesInput] = useState({});
  const notesTimeoutRef = useRef({});

  // Update hasAnyRole when user changes
  useEffect(() => {
    if (user) {
      setHasAnyRole(user.hasAccess);
    } else {
      setHasAnyRole(false);
    }
  }, [user]);

  // Function to apply filters
  const applyFilters = useCallback(
    (members) => {
      return members.filter((member) => {
        if (filters.guild && member.guild !== filters.guild) return false;
        if (
          filters.primary_weapon &&
          member.primary_weapon !== filters.primary_weapon
        )
          return false;
        if (
          filters.secondary_weapon &&
          member.secondary_weapon !== filters.secondary_weapon
        )
          return false;
        if (filters.has_thread !== "") {
          const hasThread = filters.has_thread === "true";
          if (member.has_thread !== hasThread) return false;
        }
        return true;
      });
    },
    [filters]
  );

  // Effect to handle filtering
  useEffect(() => {
    if (allMembers.length > 0) {
      const filtered = applyFilters(allMembers);
      setFilteredMembers(filtered);
    }
  }, [filters, allMembers, applyFilters]);

  // Initialize notesInput when vodTracking changes
  useEffect(() => {
    setNotesInput((prev) => {
      const newNotesInput = { ...prev };
      Object.entries(vodTracking).forEach(([discordId, data]) => {
        if (!(discordId in prev)) {
          newNotesInput[discordId] = data.notes;
        }
      });
      return newNotesInput;
    });
  }, [vodTracking]);

  // Add function to handle VOD check changes
  const handleVodCheck = async (discordId, checked, primary, secondary) => {
    // Only allow weapon leads to edit their weapons
    if (!hasWeaponLeadPermission(user, primary, secondary)) {
      return;
    }

    const today = formatDate(new Date());

    try {
      setUpdatingVods((prev) => new Set([...prev, discordId]));

      const response = await fetch(`${API_URL}/api/vod-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          discordId,
          checked,
          primary,
          secondary,
          vod_check_date: checked ? today : null,
          notes: vodTracking[discordId]?.notes || "",
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : parseInt(vodTracking[discordId]?.gear_score) || null,
          gear_checked: vodTracking[discordId]?.gear_checked || false,
          gear_check_date: vodTracking[discordId]?.gear_check_date,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update VOD status");
      }

      // Update local state
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          has_vod: checked,
          vod_check_date: checked ? today : null,
          vod_check_lead: checked ? user.username : null,
        },
      }));
    } catch (err) {
      console.error("Failed to update VOD:", err);
    } finally {
      setUpdatingVods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
    }
  };

  // Add function to handle notes changes with debounce
  const handleNotesChange = async (
    discordId,
    notes,
    primary,
    secondary,
    gear_score
  ) => {
    // Only allow weapon leads to edit their weapons
    if (!hasWeaponLeadPermission(user, primary, secondary)) {
      return;
    }

    try {
      setUpdatingVods((prev) => new Set([...prev, discordId]));

      const response = await fetch(`${API_URL}/api/vod-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          discordId,
          checked: vodTracking[discordId]?.has_vod || false,
          primary,
          secondary,
          notes,
          gear_score:
            gear_score === ""
              ? null
              : gear_score || vodTracking[discordId]?.gear_score,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update notes");
      }

      // Update local state
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          notes,
          gear_score:
            gear_score === ""
              ? null
              : gear_score || prev[discordId]?.gear_score,
          updated: new Date().toLocaleDateString(),
        },
      }));
    } catch (err) {
      console.error("Failed to update notes:", err);
      // Revert the input state on error
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          notes: vodTracking[discordId]?.notes || "",
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : vodTracking[discordId]?.gear_score || null,
        },
      }));
    } finally {
      setUpdatingVods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
    }
  };

  // Add function to handle date refresh
  const handleDateRefresh = async (discordId, primary, secondary) => {
    // Only allow weapon leads to edit their weapons
    if (!hasWeaponLeadPermission(user, primary, secondary)) {
      return;
    }

    const today = formatDate(new Date());

    try {
      setUpdatingVods((prev) => new Set([...prev, discordId]));

      const response = await fetch(`${API_URL}/api/vod-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          discordId,
          checked: vodTracking[discordId]?.has_vod || false,
          primary,
          secondary,
          vod_check_date: today,
          vod_check_lead: user.username,
          notes: vodTracking[discordId]?.notes || "",
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : parseInt(vodTracking[discordId]?.gear_score) || null,
          gear_checked: vodTracking[discordId]?.gear_checked || false,
          gear_check_date: vodTracking[discordId]?.gear_check_date,
          gear_check_lead: vodTracking[discordId]?.gear_check_lead,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update date");
      }

      // Update local state with new date and lead
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          vod_check_date: today,
          vod_check_lead: user.username,
        },
      }));
    } catch (err) {
      console.error("Failed to refresh date:", err);
    } finally {
      setUpdatingVods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
    }
  };

  // Add function to handle gear check changes
  const handleGearCheck = async (discordId, checked, primary, secondary) => {
    // Only allow weapon leads to edit their weapons
    if (!hasWeaponLeadPermission(user, primary, secondary)) {
      return;
    }

    const today = formatDate(new Date());

    try {
      setUpdatingVods((prev) => new Set([...prev, discordId]));

      const response = await fetch(`${API_URL}/api/vod-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          discordId,
          checked: vodTracking[discordId]?.has_vod || false,
          primary,
          secondary,
          notes: vodTracking[discordId]?.notes || "",
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : parseInt(vodTracking[discordId]?.gear_score) || null,
          gear_checked: checked,
          gear_check_date: checked ? today : null,
          gear_check_lead: checked ? user.username : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update gear status");
      }

      // Update local state
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          gear_checked: checked,
          gear_check_date: checked ? today : null,
          gear_check_lead: checked ? user.username : null,
        },
      }));
    } catch (err) {
      console.error("Failed to update gear:", err);
    } finally {
      setUpdatingVods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
    }
  };

  // Add function to handle gear date refresh
  const handleGearDateRefresh = async (discordId, primary, secondary) => {
    // Only allow weapon leads to edit their weapons
    if (!hasWeaponLeadPermission(user, primary, secondary)) {
      return;
    }

    const today = formatDate(new Date());

    try {
      setUpdatingVods((prev) => new Set([...prev, discordId]));

      const response = await fetch(`${API_URL}/api/vod-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          discordId,
          checked: vodTracking[discordId]?.has_vod || false,
          primary,
          secondary,
          notes: vodTracking[discordId]?.notes || "",
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : parseInt(vodTracking[discordId]?.gear_score) || null,
          gear_checked: vodTracking[discordId]?.gear_checked || false,
          gear_check_date: today,
          gear_check_lead: user.username,
          vod_check_date: vodTracking[discordId]?.vod_check_date,
          vod_check_lead: vodTracking[discordId]?.vod_check_lead,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update gear date");
      }

      // Update local state with new date and lead
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          gear_check_date: today,
          gear_check_lead: user.username,
        },
      }));
    } catch (err) {
      console.error("Failed to refresh gear date:", err);
    } finally {
      setUpdatingVods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
    }
  };

  // Add function to handle gear score changes with debounce
  const handleGearScoreChange = async (
    discordId,
    gear_score,
    primary,
    secondary
  ) => {
    // Only allow weapon leads to edit their weapons
    if (!hasWeaponLeadPermission(user, primary, secondary)) {
      return;
    }

    // Convert to integer and validate
    const gearScoreInt = parseInt(gear_score, 10);
    if (
      gear_score !== "" &&
      (isNaN(gearScoreInt) || gearScoreInt < 0 || gearScoreInt > 5000)
    ) {
      console.error("Invalid gear score value");
      // Revert to previous value
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : vodTracking[discordId]?.gear_score || null,
        },
      }));
      return;
    }

    try {
      setUpdatingVods((prev) => new Set([...prev, discordId]));

      const response = await fetch(`${API_URL}/api/vod-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          discordId,
          checked: vodTracking[discordId]?.has_vod || false,
          primary,
          secondary,
          notes: vodTracking[discordId]?.notes || "",
          gear_score: gear_score === "" ? null : gearScoreInt,
          gear_checked: vodTracking[discordId]?.gear_checked || false,
          vod_check_date: vodTracking[discordId]?.vod_check_date,
          gear_check_date: vodTracking[discordId]?.gear_check_date,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update gear score");
      }

      // Update local state
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          gear_score: gear_score === "" ? null : gearScoreInt,
        },
      }));
    } catch (err) {
      console.error("Failed to update gear score:", err);
      // Revert the input state on error
      setVodTracking((prev) => ({
        ...prev,
        [discordId]: {
          ...prev[discordId],
          gear_score:
            vodTracking[discordId]?.gear_score === ""
              ? null
              : vodTracking[discordId]?.gear_score || null,
        },
      }));
    } finally {
      setUpdatingVods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(discordId);
        return newSet;
      });
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(notesTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  const login = () => {
    window.location.href = getDiscordUrl();
  };

  const logout = async () => {
    try {
      await discordLogout();
      setVodTracking({});
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Show error state if data fetch failed
  if (isError) {
    return (
      <Container fluid p="md">
        <Stack gap="md" align="center">
          <Title order={2} color="red">
            Error Loading Data
          </Title>
          <Text>
            {error?.message || "Failed to load data. Please try again."}
          </Text>
          <Button onClick={() => window.location.reload()} color="red">
            Retry
          </Button>
        </Stack>
      </Container>
    );
  }

  // Show initial loading screen during auth check or data loading
  if (authChecking || loading || isFetching) {
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

  // Show login page if not logged in
  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  // Show no access message if logged in but no roles
  if (!hasAnyRole) {
    return (
      <Stack h="100vh" justify="center" align="center" gap="lg">
        <Title>No Access</Title>
        <Text>You need to have a weapon lead role to access this page.</Text>
        <Button onClick={logout} variant="filled" color="red">
          Logout
        </Button>
      </Stack>
    );
  }

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
                    to="/statics"
                    variant="subtle"
                    size="sm"
                    replace
                  >
                    Statics
                  </Button>
                </>
              ) : hasMasterRole(user) ? (
                <>
                  <Badge color="red" size="lg" radius="md">
                    Master Access
                  </Badge>
                  <Button
                    component={Link}
                    to="/statics"
                    variant="subtle"
                    size="sm"
                    replace
                  >
                    Statics
                  </Button>
                </>
              ) : (
                <Badge color="green" size="lg" radius="md">
                  Weapon Lead
                </Badge>
              )}
            </Group>
            <Button
              onClick={logout}
              variant="light"
              color="red"
              radius="md"
              leftSection={<IconLogout size={16} />}
            >
              Logout
            </Button>
          </Group>
        </Paper>

        <Title
          ta="center"
          variant="gradient"
          gradient={{ from: "indigo", to: "violet", deg: 45 }}
          order={1}
          size="h2"
          mb="md"
        >
          VOD Tracker
        </Title>

        <Filters
          onFilterChange={handleFilterChange}
          uniqueValues={uniqueValues}
          disabled={loading || isFetching}
        />

        <Paper withBorder shadow="sm">
          <Box p="md" style={{ borderBottom: "1px solid #333" }}>
            <Group justify="space-between" align="center">
              <Title order={2} size="h3">
                Players
              </Title>
              <Text size="sm" c="dimmed">
                Total: {loading || isFetching ? "-" : filteredMembers.length}
              </Text>
            </Group>
          </Box>
          <Box
            style={{
              overflowX: "auto",
              position: "relative",
              minHeight: "200px",
            }}
          >
            {loading || isFetching ? (
              <TableSkeleton />
            ) : (
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
                  {filteredMembers.length === 0 ? (
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
                    filteredMembers.map((doc) => {
                      const canEditVod = hasWeaponLeadPermission(
                        user,
                        doc.primary_weapon,
                        doc.secondary_weapon
                      );

                      return (
                        <Table.Tr key={doc.$id}>
                          <Table.Td>{doc.discord_username}</Table.Td>
                          <Table.Td>{doc.ingame_name}</Table.Td>
                          <Table.Td>{doc.guild}</Table.Td>
                          <Table.Td>{doc.primary_weapon}</Table.Td>
                          <Table.Td>{doc.secondary_weapon}</Table.Td>
                          <Table.Td>
                            <Badge
                              color={doc.has_thread ? "green" : "red"}
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
                              {doc.has_thread ? "✓" : "✕"}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {updatingVods.has(doc.discord_id) ? (
                              <LoadingOverlay visible={true} />
                            ) : (
                              <Checkbox
                                checked={
                                  vodTracking[doc.discord_id]?.has_vod || false
                                }
                                onChange={(e) =>
                                  handleVodCheck(
                                    doc.discord_id,
                                    e.currentTarget.checked,
                                    doc.primary_weapon,
                                    doc.secondary_weapon
                                  )
                                }
                                disabled={
                                  !doc.has_thread ||
                                  updatingVods.has(doc.discord_id) ||
                                  !canEditVod
                                }
                              />
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              {vodTracking[doc.discord_id]?.vod_check_date ? (
                                <Tooltip
                                  label={`Last checked by: ${
                                    vodTracking[doc.discord_id].vod_check_lead
                                  }`}
                                  position="top"
                                  withArrow
                                  color="dark"
                                  openDelay={300}
                                >
                                  <Badge size="sm" variant="light" color="blue">
                                    {vodTracking[doc.discord_id].vod_check_date}
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
                                    handleDateRefresh(
                                      doc.discord_id,
                                      doc.primary_weapon,
                                      doc.secondary_weapon
                                    )
                                  }
                                  disabled={
                                    updatingVods.has(doc.discord_id) ||
                                    !canEditVod ||
                                    !doc.has_thread ||
                                    !vodTracking[doc.discord_id]?.has_vod
                                  }
                                  title={
                                    !vodTracking[doc.discord_id]?.has_vod
                                      ? "VOD must be checked first"
                                      : "Update check date"
                                  }
                                >
                                  <IconRefresh size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {updatingVods.has(doc.discord_id) ? (
                              <LoadingOverlay visible={true} />
                            ) : (
                              <Checkbox
                                checked={
                                  vodTracking[doc.discord_id]?.gear_checked ||
                                  false
                                }
                                onChange={(e) =>
                                  handleGearCheck(
                                    doc.discord_id,
                                    e.currentTarget.checked,
                                    doc.primary_weapon,
                                    doc.secondary_weapon
                                  )
                                }
                                disabled={
                                  !doc.has_thread ||
                                  updatingVods.has(doc.discord_id) ||
                                  !canEditVod
                                }
                              />
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              {vodTracking[doc.discord_id]?.gear_check_date ? (
                                <Tooltip
                                  label={`Last checked by: ${
                                    vodTracking[doc.discord_id].gear_check_lead
                                  }`}
                                  position="top"
                                  withArrow
                                  color="dark"
                                  openDelay={300}
                                >
                                  <Badge size="sm" variant="light" color="blue">
                                    {
                                      vodTracking[doc.discord_id]
                                        .gear_check_date
                                    }
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
                                    handleGearDateRefresh(
                                      doc.discord_id,
                                      doc.primary_weapon,
                                      doc.secondary_weapon
                                    )
                                  }
                                  disabled={
                                    updatingVods.has(doc.discord_id) ||
                                    !canEditVod ||
                                    !doc.has_thread ||
                                    !vodTracking[doc.discord_id]?.gear_checked
                                  }
                                  title={
                                    !vodTracking[doc.discord_id]?.gear_checked
                                      ? "Gear must be checked first"
                                      : "Update check date"
                                  }
                                >
                                  <IconRefresh size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              value={
                                vodTracking[doc.discord_id]?.gear_score ?? ""
                              }
                              onChange={(e) => {
                                const value = e.currentTarget.value;
                                if (/^\d{0,4}$/.test(value)) {
                                  setVodTracking((prev) => ({
                                    ...prev,
                                    [doc.discord_id]: {
                                      ...prev[doc.discord_id],
                                      gear_score: value,
                                    },
                                  }));

                                  if (notesTimeoutRef.current[doc.discord_id]) {
                                    clearTimeout(
                                      notesTimeoutRef.current[doc.discord_id]
                                    );
                                  }

                                  notesTimeoutRef.current[doc.discord_id] =
                                    setTimeout(() => {
                                      handleGearScoreChange(
                                        doc.discord_id,
                                        value,
                                        doc.primary_weapon,
                                        doc.secondary_weapon
                                      );
                                    }, 1000);
                                }
                              }}
                              placeholder="CP"
                              disabled={
                                !doc.has_thread ||
                                updatingVods.has(doc.discord_id) ||
                                !canEditVod
                              }
                              maxLength={4}
                              w={75}
                              size="xs"
                              styles={{
                                input: {
                                  textAlign: "center",
                                  "&:disabled": {
                                    opacity: 0.6,
                                    backgroundColor: "#1a1a1a",
                                    cursor: "not-allowed",
                                  },
                                },
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Textarea
                              value={
                                notesInput[doc.discord_id] ??
                                vodTracking[doc.discord_id]?.notes ??
                                ""
                              }
                              onChange={(e) => {
                                const notes = e.currentTarget.value.slice(
                                  0,
                                  500
                                );
                                // Allow more special characters but still prevent potentially harmful ones
                                if (
                                  /^[a-zA-Z0-9\s.,!?@#$%&*()_+=\-[\]{}|:;<>/'"`~]*$/.test(
                                    notes
                                  )
                                ) {
                                  setNotesInput((prev) => ({
                                    ...prev,
                                    [doc.discord_id]: notes,
                                  }));

                                  if (notesTimeoutRef.current[doc.discord_id]) {
                                    clearTimeout(
                                      notesTimeoutRef.current[doc.discord_id]
                                    );
                                  }

                                  notesTimeoutRef.current[doc.discord_id] =
                                    setTimeout(() => {
                                      handleNotesChange(
                                        doc.discord_id,
                                        notes,
                                        doc.primary_weapon,
                                        doc.secondary_weapon
                                      );
                                    }, 1000);
                                }
                              }}
                              placeholder="Add notes..."
                              disabled={
                                updatingVods.has(doc.discord_id) || !canEditVod
                              }
                              maxLength={500}
                              styles={{
                                root: { minWidth: 200, width: "100%" },
                                input: {
                                  height: 32,
                                  transition: "all 0.2s ease",
                                },
                                wrapper: { height: "auto" },
                              }}
                              autosize
                              minRows={1}
                              maxRows={4}
                              size="xs"
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            )}
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}

// Export both components
export { OAuthCallback };
export default App;
