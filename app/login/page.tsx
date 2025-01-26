"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Stack, Title, Button, Text, Container, Paper } from "@mantine/core";
import { IconBrandDiscord } from "@tabler/icons-react";
import classes from "./login.module.css";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/vodtracker");
    }
  }, [session, router]);

  if (status === "loading") {
    return null;
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center" className={classes.title} fw={900}>
        Hazardous
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Please log in with Discord to access the tool
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          <Text size="sm" ta="center">
            This tool is only available to weapon leads and masters.
          </Text>

          <Button
            onClick={() => signIn("discord")}
            variant="filled"
            size="lg"
            fullWidth
            leftSection={<IconBrandDiscord size={20} />}
          >
            Login with Discord
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
