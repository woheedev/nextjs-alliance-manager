"use client";

import { useState, useEffect } from "react";
import {
  Stack,
  Paper,
  Group,
  Button,
  Title,
  Container,
  Text,
  Box,
} from "@mantine/core";
import { useAuth } from "@/app/hooks/useAuth";
import { Filters } from "@/app/components/vod/Filters";
import { VodTable } from "@/app/components/vod/VodTable";
import { LoadingOverlay } from "@/app/components/common/LoadingOverlay";
import { useVodData } from "@/app/hooks/useVodData";
import { useAllData } from "@/app/hooks/useAllData";
import { useAccess } from "@/app/hooks/useAccess";
import { checkAccess } from "@/app/lib/access-control";
import type { FilterValues, Member } from "@/app/types";

export default function VodTrackerPage() {
  const { isLoading, user } = useAuth();
  const { hasAccess } = useAccess({
    requiresAuth: true,
    check: (user) => checkAccess.hasAnyAccess(user),
  });
  const { data, loading, error, mutate } = useAllData();
  const [filters, setFilters] = useState<FilterValues>({
    guild: "",
    primary_weapon: "",
    secondary_weapon: "",
    has_thread: "",
    nameSearch: "",
    showEditable: false,
  });

  const {
    updatingVods,
    handleVodCheck,
    handleNotesChange,
    handleGearCheck,
    handleGearScoreChange,
    notesInput,
    gearScoreInput,
  } = useVodData();

  if (isLoading || loading) return <LoadingOverlay />;
  if (!hasAccess) return null;
  if (error) {
    return (
      <Container fluid p="md">
        <Stack gap="md" align="center">
          <Title order={2} c="red">
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
  if (!data) return null;

  const filteredMembers = data.members.filter((m: Member) => {
    if (filters.guild && m.guild !== filters.guild) return false;
    if (filters.primary_weapon && m.primary_weapon !== filters.primary_weapon)
      return false;
    if (
      filters.secondary_weapon &&
      m.secondary_weapon !== filters.secondary_weapon
    )
      return false;
    if (filters.has_thread && m.has_thread !== (filters.has_thread === "true"))
      return false;
    if (
      filters.nameSearch &&
      !(
        m.discord_username
          ?.toLowerCase()
          .includes(filters.nameSearch.toLowerCase()) ||
        m.ingame_name?.toLowerCase().includes(filters.nameSearch.toLowerCase())
      )
    )
      return false;

    // Filter by editable status if the option is selected
    if (filters.showEditable && user) {
      const canEdit =
        checkAccess.isLeadership(user) ||
        checkAccess.canEditWeapon(user, m.primary_weapon, m.secondary_weapon);
      if (!canEdit) {
        return false;
      }
    }

    return true;
  });

  return (
    <Stack gap="md">
      <Filters
        onFilterChange={setFilters}
        uniqueValues={data.uniqueValues}
        disabled={loading}
      />
      <Paper withBorder shadow="sm">
        <Box p="md" style={{ borderBottom: "1px solid #333" }}>
          <Group justify="space-between" align="center">
            <Title order={2} size="h3">
              Players
            </Title>
            <Text size="sm" c="dimmed">
              Total: {loading ? "-" : filteredMembers.length}
            </Text>
          </Group>
        </Box>
        <VodTable
          members={filteredMembers}
          vodTracking={data.vodTracking}
          onVodCheck={async (discordId, checked, primary, secondary) => {
            await handleVodCheck(
              discordId,
              checked,
              primary,
              secondary,
              data.vodTracking,
              mutate
            );
          }}
          onGearCheck={async (discordId, checked, primary, secondary) => {
            await handleGearCheck(
              discordId,
              checked,
              primary,
              secondary,
              data.vodTracking,
              mutate
            );
          }}
          onNotesChange={(discordId, notes, primary, secondary) => {
            handleNotesChange(
              discordId,
              notes,
              primary,
              secondary,
              data.vodTracking,
              mutate
            );
          }}
          onGearScoreChange={(discordId, score, primary, secondary) => {
            handleGearScoreChange(
              discordId,
              score,
              primary,
              secondary,
              data.vodTracking,
              mutate
            );
          }}
          updatingVods={updatingVods}
          notesInput={notesInput}
          gearScoreInput={gearScoreInput}
        />
      </Paper>
    </Stack>
  );
}
