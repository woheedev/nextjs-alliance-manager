import { useState, useCallback, useRef, useEffect } from "react";
import type { VodTracking } from "@/app/types";
import { checkAccess } from "@/app/lib/access-control";
import { useAuth } from "@/app/hooks/useAuth";

export function useVodData() {
  const { user } = useAuth();
  const [updatingVods, setUpdatingVods] = useState<Set<string>>(new Set());
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const [gearScoreInput, setGearScoreInput] = useState<Record<string, string>>(
    {}
  );
  const notesTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const gearScoreTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      /* eslint-disable react-hooks/exhaustive-deps */
      // Copy ref values to avoid closure issues
      const notesTimeouts = { ...notesTimeoutRef.current };
      const gearScoreTimeouts = { ...gearScoreTimeoutRef.current };
      /* eslint-enable react-hooks/exhaustive-deps */

      Object.values(notesTimeouts).forEach((timeout) => clearTimeout(timeout));
      Object.values(gearScoreTimeouts).forEach((timeout) =>
        clearTimeout(timeout)
      );
    };
  }, []);

  const validateGearScore = (score: number): number => {
    if (score < 3000) return 3000;
    if (score > 5000) return 5000;
    return score;
  };

  const handleVodCheck = useCallback(
    async (
      discordId: string,
      checked: boolean,
      primary: string,
      secondary: string,
      vodTracking: Record<string, VodTracking>,
      updateVodTracking: (newData: Record<string, VodTracking>) => void
    ) => {
      if (!user || !checkAccess.canEditWeapon(user, primary, secondary)) return;
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
    [user]
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
      if (!user || !checkAccess.canEditWeapon(user, primary, secondary)) return;

      // Update local state immediately
      setNotesInput((prev) => ({ ...prev, [discordId]: notes }));

      // Clear existing timeout for this member
      if (notesTimeoutRef.current[discordId]) {
        clearTimeout(notesTimeoutRef.current[discordId]);
      }

      // Set new timeout for API call
      notesTimeoutRef.current[discordId] = setTimeout(async () => {
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
      }, 1000); // 1 second debounce
    },
    [user]
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
      if (!user || !checkAccess.canEditWeapon(user, primary, secondary)) return;
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
    [user]
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
      // Only allow numbers and empty string
      if (score !== "" && !/^\d+$/.test(score)) return;

      if (!user || !checkAccess.canEditWeapon(user, primary, secondary)) return;

      // Update local state immediately
      setGearScoreInput((prev) => ({ ...prev, [discordId]: score }));

      // Clear existing timeout for this member
      if (gearScoreTimeoutRef.current[discordId]) {
        clearTimeout(gearScoreTimeoutRef.current[discordId]);
      }

      // Set new timeout for API call
      gearScoreTimeoutRef.current[discordId] = setTimeout(async () => {
        try {
          setUpdatingVods((prev) => new Set([...prev, discordId]));

          // Validate score before sending to API
          const validatedScore =
            score === "" ? null : validateGearScore(parseInt(score));

          const response = await fetch("/api/vod-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              discordId,
              primary,
              secondary,
              gear_score: validatedScore,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to update gear score");
          }

          // Update local state with validated score
          const displayScore =
            validatedScore === null ? "" : validatedScore.toString();
          setGearScoreInput((prev) => ({ ...prev, [discordId]: displayScore }));

          updateVodTracking({
            ...vodTracking,
            [discordId]: {
              ...vodTracking[discordId],
              gear_score: displayScore,
            },
          });
        } catch (error) {
          console.error("Failed to update gear score:", error);
          // Reset to previous value on error
          setGearScoreInput((prev) => ({
            ...prev,
            [discordId]: vodTracking[discordId]?.gear_score || "",
          }));
        } finally {
          setUpdatingVods((prev) => {
            const newSet = new Set(prev);
            newSet.delete(discordId);
            return newSet;
          });
        }
      }, 1000); // 1 second debounce
    },
    [user]
  );

  return {
    updatingVods,
    notesInput,
    gearScoreInput,
    setNotesInput,
    handleVodCheck,
    handleNotesChange,
    handleGearCheck,
    handleGearScoreChange,
  };
}
