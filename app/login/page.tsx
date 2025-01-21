"use client";

import { Stack, Title, Text, Button } from "@mantine/core";
import { useRouter } from "next/navigation";

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI;

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID!,
      redirect_uri: REDIRECT_URI!,
      response_type: "code",
      scope: "identify guilds.members.read",
    });

    window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
  };

  return (
    <Stack h="100vh" justify="center" align="center" gap="lg">
      <Title>VOD Tracker</Title>
      <Text>Please log in with Discord to access the tool</Text>
      <Button onClick={handleLogin} variant="filled" size="lg">
        Login with Discord
      </Button>
    </Stack>
  );
}
