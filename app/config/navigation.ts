import { AccessRules } from "@/app/lib/access-control";
import type { User } from "@/app/types";

export interface NavItem {
  link: string;
  label: string;
  access:
    | (typeof AccessRules)[keyof typeof AccessRules]
    | { check: (user: User) => boolean };
}

export const navigation: NavItem[] = [
  {
    link: "/vodtracker",
    label: "VOD Tracker",
    access: AccessRules.weaponLead,
  },
  {
    link: "/statics",
    label: "Statics",
    access: AccessRules.master,
  },
];
