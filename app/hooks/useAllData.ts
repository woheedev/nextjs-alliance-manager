"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { AllData } from "@/app/types";
import { checkAccess } from "@/app/lib/access-control";

export function useAllData() {
  const { data: session } = useSession();
  const [data, setData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/all-data");
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user && checkAccess.hasAnyAccess(session.user)) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [session, fetchData]);

  const mutate = useCallback(() => {
    if (session?.user && checkAccess.hasAnyAccess(session.user)) {
      setLoading(true);
      return fetchData();
    }
    return Promise.resolve();
  }, [fetchData, session]);

  return { data, loading, error, mutate };
}
