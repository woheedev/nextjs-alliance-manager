"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { checkAccess } from "@/app/lib/access-control";
import { LoadingOverlay } from "./components/common/LoadingOverlay";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user && checkAccess.hasAnyAccess(user)) {
        router.push("/vodtracker");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return <LoadingOverlay />;
}
