import { Group, Title } from "@mantine/core";

export default function Header() {
  return (
    <Group h="100%" px="md">
      <Title order={1} size="h3">
        VOD Tracker
      </Title>
    </Group>
  );
}
