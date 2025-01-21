"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "@/app/components/common/LoadingOverlay";
import { Stack, Title, Text, Button } from "@mantine/core";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    const handleCallback = async () => {
      if (!code) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/discord/callback?code=${code}`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Authentication failed");
        }

        router.push("/");
      } catch (error) {
        console.error("Callback error:", error);
        router.push("/login");
      }
    };

    handleCallback();
  }, [code, router]);

  if (!code) {
    return (
      <Stack h="100vh" justify="center" align="center" gap="lg">
        <Title order={2} c="red">
          Authentication Error
        </Title>
        <Text>No authorization code received</Text>
        <Button
          onClick={() => router.push("/login")}
          variant="filled"
          color="red"
        >
          Return to Login
        </Button>
      </Stack>
    );
  }

  return <LoadingOverlay />;
}
