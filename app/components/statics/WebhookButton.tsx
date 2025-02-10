import { useState } from "react";
import { Button, Modal, Text, Stack } from "@mantine/core";
import { IconBrandDiscord } from "@tabler/icons-react";

interface WebhookButtonProps {
  selectedGuild: string;
}

export function WebhookButton({ selectedGuild }: WebhookButtonProps) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedGuild) return;

    setLoading(true);
    try {
      const response = await fetch("/api/statics/discord-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          guild: selectedGuild,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send statics to Discord");
      }

      // Close modal on success
      setOpened(false);
    } catch (error) {
      console.error("Error sending statics to Discord:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        leftSection={<IconBrandDiscord size={20} />}
        onClick={() => setOpened(true)}
        variant="light"
        disabled={!selectedGuild}
      >
        Send to Discord
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Send Statics to Discord"
      >
        <Stack>
          <Text>
            Are you sure you want to send the current static configuration for{" "}
            {selectedGuild} to Discord?
          </Text>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!selectedGuild}
            fullWidth
          >
            Send to Discord
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
