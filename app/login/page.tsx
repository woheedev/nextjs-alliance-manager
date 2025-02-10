"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Stack, Title, Button, Text, Container, Paper } from "@mantine/core";
import { IconBrandDiscord } from "@tabler/icons-react";
import { checkAccess } from "@/app/lib/access-control";
import classes from "./login.module.css";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user && checkAccess.hasAnyAccess(session.user)) {
      router.push("/vodtracker");
    }
  }, [session, router]);

  if (status === "loading") {
    return null;
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title} fw={750}>
        Hazardous
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {session
          ? "You don't have access to this tool"
          : "Please log in with Discord to access the tool"}
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <Text size="sm" ta="center">
            This tool is only available to weapon leads and masters.
          </Text>

          {!session ? (
            <Button
              onClick={() => signIn("discord")}
              variant="filled"
              size="lg"
              fullWidth
              leftSection={<IconBrandDiscord size={20} />}
            >
              Login with Discord
            </Button>
          ) : (
            <Text size="sm" c="red" ta="center">
              Your Discord account does not have the required roles. Please
              contact an administrator if you believe this is a mistake.
            </Text>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
