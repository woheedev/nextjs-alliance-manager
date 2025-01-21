"use client";

import { Group, Button, Title, Badge } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasMasterRole } from "@/app/lib/auth";
import { useAuth } from "@/app/hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        {hasMasterRole(user.roles) &&
        user.weaponPermissions &&
        user.weaponPermissions.length > 0 ? (
          <>
            <Badge
              variant="gradient"
              gradient={{ from: "red", to: "green", deg: 90 }}
              size="lg"
              radius="md"
            >
              Master + Weapon Lead
            </Badge>
            <Button component={Link} href="/statics" variant="subtle" size="sm">
              Statics
            </Button>
          </>
        ) : hasMasterRole(user.roles) ? (
          <>
            <Badge color="red" size="lg" radius="md">
              Master Access
            </Badge>
            <Button component={Link} href="/statics" variant="subtle" size="sm">
              Statics
            </Button>
          </>
        ) : (
          <Badge color="green" size="lg" radius="md">
            Weapon Lead
          </Badge>
        )}
      </Group>

      <Button
        onClick={handleLogout}
        variant="light"
        color="red"
        radius="md"
        leftSection={<IconLogout size={16} />}
      >
        Logout
      </Button>
    </Group>
  );
}
