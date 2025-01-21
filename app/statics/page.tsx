"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { StaticsView } from "@/app/components/statics/StaticsView";
import { LoadingOverlay } from "@/app/components/common/LoadingOverlay";
import type { Member, Static } from "@/app/types";

export default function StaticsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<{
    members: Member[];
    statics: Static[];
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
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
    return <LoadingOverlay />;
  }

  return <StaticsView members={data.members} statics={data.statics} />;
}
