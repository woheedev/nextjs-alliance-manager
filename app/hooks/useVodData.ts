import { useState, useCallback } from "react";
import type { Member, VodTracking } from "@/app/types";

export function useVodData() {
  const [updatingVods, setUpdatingVods] = useState<Set<string>>(new Set());
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});

  const handleVodCheck = useCallback(
    async (
      discordId: string,
      checked: boolean,
      primary: string,
      secondary: string,
      vodTracking: Record<string, VodTracking>,
      updateVodTracking: (newData: Record<string, VodTracking>) => void
    ) => {
      try {
        setUpdatingVods((prev) => new Set([...prev, discordId]));

        const response = await fetch("/api/vod-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            discordId,
            checked,
            primary,
            secondary,
            vod_check_date: checked ? new Date().toISOString() : null,
            notes: vodTracking[discordId]?.notes || "",
            gear_score:
              vodTracking[discordId]?.gear_score === ""
                ? null
                : parseInt(vodTracking[discordId]?.gear_score || "0") || null,
            gear_checked: vodTracking[discordId]?.gear_checked || false,
            gear_check_date: vodTracking[discordId]?.gear_check_date,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update VOD status");
        }

        updateVodTracking({
          ...vodTracking,
          [discordId]: {
            ...vodTracking[discordId],
            has_vod: checked,
            vod_check_date: checked ? new Date().toISOString() : null,
          },
        });
      } catch (error) {
        console.error("Failed to update VOD:", error);
      } finally {
        setUpdatingVods((prev) => {
          const newSet = new Set(prev);
          newSet.delete(discordId);
          return newSet;
        });
      }
    },
    []
  );

  const handleNotesChange = useCallback(
    async (
      discordId: string,
      notes: string,
      primary: string,
      secondary: string,
      vodTracking: Record<string, VodTracking>,
      updateVodTracking: (newData: Record<string, VodTracking>) => void
    ) => {
      try {
        setUpdatingVods((prev) => new Set([...prev, discordId]));

        const response = await fetch("/api/vod-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            discordId,
            checked: vodTracking[discordId]?.has_vod || false,
            primary,
            secondary,
            notes,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update notes");
        }

        updateVodTracking({
          ...vodTracking,
          [discordId]: {
            ...vodTracking[discordId],
            notes,
          },
        });
      } catch (error) {
        console.error("Failed to update notes:", error);
        setNotesInput((prev) => ({
          ...prev,
          [discordId]: vodTracking[discordId]?.notes || "",
        }));
      } finally {
        setUpdatingVods((prev) => {
          const newSet = new Set(prev);
          newSet.delete(discordId);
          return newSet;
        });
      }
    },
    []
  );

  const handleGearCheck = useCallback(
    async (
      discordId: string,
      checked: boolean,
      primary: string,
      secondary: string,
      vodTracking: Record<string, VodTracking>,
      updateVodTracking: (newData: Record<string, VodTracking>) => void
    ) => {
      try {
        setUpdatingVods((prev) => new Set([...prev, discordId]));

        const response = await fetch("/api/vod-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            discordId,
            primary,
            secondary,
            gear_checked: checked,
            gear_check_date: checked ? new Date().toISOString() : null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update gear check");
        }

        updateVodTracking({
          ...vodTracking,
          [discordId]: {
            ...vodTracking[discordId],
            gear_checked: checked,
            gear_check_date: checked ? new Date().toISOString() : null,
          },
        });
      } catch (error) {
        console.error("Failed to update gear check:", error);
      } finally {
        setUpdatingVods((prev) => {
          const newSet = new Set(prev);
          newSet.delete(discordId);
          return newSet;
        });
      }
    },
    []
  );

  const handleGearScoreChange = useCallback(
    async (
      discordId: string,
      score: string,
      primary: string,
      secondary: string,
      vodTracking: Record<string, VodTracking>,
      updateVodTracking: (newData: Record<string, VodTracking>) => void
    ) => {
      try {
        setUpdatingVods((prev) => new Set([...prev, discordId]));

        const response = await fetch("/api/vod-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            discordId,
            primary,
            secondary,
            gear_score: score === "" ? null : parseInt(score) || null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update gear score");
        }

        updateVodTracking({
          ...vodTracking,
          [discordId]: {
            ...vodTracking[discordId],
            gear_score: score,
          },
        });
      } catch (error) {
        console.error("Failed to update gear score:", error);
      } finally {
        setUpdatingVods((prev) => {
          const newSet = new Set(prev);
          newSet.delete(discordId);
          return newSet;
        });
      }
    },
    []
  );

  return {
    updatingVods,
    notesInput,
    setNotesInput,
    handleVodCheck,
    handleNotesChange,
    handleGearCheck,
    handleGearScoreChange,
  };
}
