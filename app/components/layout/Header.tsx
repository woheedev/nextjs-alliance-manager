"use client";

import { useState } from "react";
import { IconChevronDown, IconLogout } from "@tabler/icons-react";
import cx from "clsx";
import {
  Avatar,
  Container,
  Group,
  Menu,
  Text,
  UnstyledButton,
  Badge,
} from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useAuth } from "@/app/hooks/useAuth";
import { checkAccess } from "@/app/lib/access-control";
import classes from "./Header.module.css";
import { navigation } from "@/app/config/navigation";

export function Header() {
  const { user } = useAuth();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userMenuOpened, setUserMenuOpened] = useState(false);

  if (!user || !session?.user) return null;

  const getAccessBadge = () => {
    const accessLevel = checkAccess.getAccessLevel(user);

    switch (accessLevel) {
      case "both":
        return (
          <Badge
            variant="gradient"
            gradient={{ from: "red", to: "green", deg: 90 }}
            size="sm"
          >
            Master + Weapon Lead
          </Badge>
        );
      case "master":
        return (
          <Badge color="red" size="sm">
            Master Access
          </Badge>
        );
      case "weaponLead":
        return (
          <Badge color="green" size="sm">
            Weapon Lead
          </Badge>
        );
      default:
        return null;
    }
  };

  const items = navigation
    .filter((item) => {
      if (typeof item.access === "function") return true;
      return !item.access.check || item.access.check(user);
    })
    .map((item) => (
      <Link
        key={item.label}
        href={item.link}
        className={classes.link}
        data-active={pathname === item.link || undefined}
      >
        {item.label}
      </Link>
    ));

  return (
    <header className={classes.header}>
      <Container size="md" className={classes.inner}>
        <Text className={classes.brand} fw={700} span>
          Hazardous
        </Text>
        <Group gap={5} className={classes.links}>
          {items}
        </Group>
        <Menu
          position="bottom-end"
          transitionProps={{ transition: "pop-top-right" }}
          onClose={() => setUserMenuOpened(false)}
          onOpen={() => setUserMenuOpened(true)}
          withinPortal
          styles={{
            dropdown: {
              minWidth: "fit-content",
              width: "auto",
            },
            item: {
              width: "100%",
            },
          }}
        >
          <Menu.Target>
            <UnstyledButton
              className={cx(classes.user, {
                [classes.userActive]: userMenuOpened,
              })}
            >
              <Group gap={7}>
                <Avatar
                  src={session.user.image}
                  alt={session.user.name || ""}
                  radius="xl"
                  size={20}
                />
                <Text fw={500} size="sm" lh={1} mr={3}>
                  {session.user.name}
                </Text>
                <IconChevronDown size={12} stroke={1.5} />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Access Level</Menu.Label>
            <Menu.Item pr="xl">{getAccessBadge()}</Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} stroke={1.5} />}
              onClick={() => signOut()}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Container>
    </header>
  );
}
