import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PropTypes from "prop-types";
import { verifySession, logout as discordLogout } from "./discord-auth";

const API_URL = import.meta.env.PROD
  ? ""
  : `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 6543}`;

const DataContext = createContext(null);

function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

const INITIAL_DATA = {
  members: [],
  uniqueValues: { guilds: [], primaryWeapons: [], secondaryWeapons: [] },
  vodTracking: {},
  statics: [],
};

export function DataProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const queryClient = useQueryClient();

  // Auth query with optimized settings
  const { isLoading: isAuthLoading, data: authData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const { user: data } = await verifySession();
        setUser(data);
        setAuthChecking(false);
        return data;
      } catch (error) {
        console.error("[Client ERROR] Auth error:", error);
        setUser(null);
        setAuthChecking(false);
        throw error;
      }
    },
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 60 * 1000, // Refresh session every 30 minutes
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Data query with optimized settings
  const {
    data: allData = INITIAL_DATA,
    isLoading: isDataLoading,
    isError,
    error,
    isFetching,
    refetch: refetchData,
  } = useQuery({
    queryKey: ["allData"],
    queryFn: async () => {
      console.log("[Client] Fetching all data");
      const response = await fetch(`${API_URL}/api/all-data`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch data");
      }
      const data = await response.json();
      console.log("[Client] Data received:", {
        members: data.members.length,
        uniqueValues: data.uniqueValues,
        vodTracking: Object.keys(data.vodTracking).length,
        statics: data.statics.length,
      });
      return data;
    },
    enabled: !!user?.hasAccess,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Only retry network errors, not auth errors
      if (error?.message?.includes("session")) return false;
      return failureCount < 2;
    },
    keepPreviousData: true,
  });

  // Memoize loading state
  const loading = useMemo(
    () =>
      (isAuthLoading && !authData) ||
      (isDataLoading && !allData.members.length) ||
      authChecking,
    [
      isAuthLoading,
      authData,
      isDataLoading,
      allData.members.length,
      authChecking,
    ]
  );

  // Optimized logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await discordLogout();
      queryClient.clear();
      setUser(null);
    },
    retry: false,
  });

  // Memoized update statics function
  const updateStatics = useCallback(
    (newStatics) => {
      queryClient.setQueryData(["allData"], (old) => ({
        ...old,
        statics: newStatics,
      }));
    },
    [queryClient]
  );

  const contextValue = useMemo(
    () => ({
      allMembers: allData.members,
      uniqueValues: allData.uniqueValues,
      vodTracking: allData.vodTracking,
      statics: allData.statics,
      loading,
      isFetching,
      isError,
      error,
      user,
      authChecking: loading,
      logout: logoutMutation.mutate,
      updateStatics,
      setUser,
      refetchData,
    }),
    [
      allData,
      loading,
      isFetching,
      isError,
      error,
      user,
      logoutMutation.mutate,
      updateStatics,
      refetchData,
    ]
  );

  return (
    <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>
  );
}

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { useData };
