"use client";

import { useEffect, useState, useCallback } from "react";
import { Stack, Paper, Group, Button, Title } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { Filters } from "@/app/components/vod/Filters";
import { VodTable } from "@/app/components/vod/VodTable";
import { TableSkeleton } from "@/app/components/vod/TableSkeleton";
import { useVodData } from "@/app/hooks/useVodData";
import type { FilterValues, Member, VodTracking } from "@/app/types";

export default function VodTrackerPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<{
    members: Member[];
    uniqueValues: {
      guilds: string[];
      primaryWeapons: string[];
      secondaryWeapons: string[];
    };
    vodTracking: Record<string, VodTracking>;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    guild: "",
    primary_weapon: "",
    secondary_weapon: "",
    has_thread: "",
  });

  const {
    updatingVods,
    notesInput,
    setNotesInput,
    handleVodCheck,
    handleNotesChange,
    handleGearCheck,
    handleGearScoreChange,
  } = useVodData();

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/all-data", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [fetchData, isLoading, router, user]);

  if (isLoading || !data) {
    return (
      <Paper p="md" mt="md">
        <TableSkeleton />
      </Paper>
    );
  }

  const filteredMembers = data.members.filter((member) => {
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
    if (filters.has_thread) {
      const hasThread = filters.has_thread === "true";
      if (member.has_thread !== hasThread) return false;
    }
    return true;
  });

  return (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Group justify="space-between" align="center">
          <Title order={2}>VOD Tracker</Title>
          <Button
            onClick={fetchData}
            variant="light"
            leftSection={<IconRefresh size={16} />}
            loading={isRefreshing}
          >
            Refresh
          </Button>
        </Group>
      </Paper>

      <Filters
        onFilterChange={setFilters}
        uniqueValues={data.uniqueValues}
        disabled={isRefreshing}
      />

      <Paper p="md" withBorder>
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
              (newData) =>
                setData((prev) => ({
                  ...prev!,
                  vodTracking: newData,
                }))
            );
          }}
          onGearCheck={async (discordId, checked, primary, secondary) => {
            await handleGearCheck(
              discordId,
              checked,
              primary,
              secondary,
              data.vodTracking,
              (newData) =>
                setData((prev) => ({
                  ...prev!,
                  vodTracking: newData,
                }))
            );
          }}
          onNotesChange={(discordId, notes, primary, secondary) => {
            handleNotesChange(
              discordId,
              notes,
              primary,
              secondary,
              data.vodTracking,
              (newData) =>
                setData((prev) => ({
                  ...prev!,
                  vodTracking: newData,
                }))
            );
          }}
          onGearScoreChange={(discordId, score, primary, secondary) => {
            handleGearScoreChange(
              discordId,
              score,
              primary,
              secondary,
              data.vodTracking,
              (newData) =>
                setData((prev) => ({
                  ...prev!,
                  vodTracking: newData,
                }))
            );
          }}
          updatingVods={updatingVods}
        />
      </Paper>
    </Stack>
  );
}
