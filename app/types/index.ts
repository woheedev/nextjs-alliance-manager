// Discord and Auth types
export interface UserData {
  userId: string;
  roles: string[];
  username: string;
}

export interface User {
  id: string;
  username: string;
  roles: string[];
  isMaster: boolean;
  hasAccess: boolean;
  weaponPermissions?: Array<{
    primary: string;
    secondary: string;
  }>;
}

// Database types
export interface Member {
  $id: string;
  discord_id: string;
  discord_username: string;
  ingame_name: string;
  guild: string;
  primary_weapon: string;
  secondary_weapon: string;
  has_thread: boolean;
}

export interface VodTracking {
  has_vod: boolean;
  notes?: string;
  vod_check_date: string | null;
  vod_check_lead: string | null;
  gear_checked: boolean;
  gear_check_date: string | null;
  gear_check_lead: string | null;
  gear_score: string | null;
}

export interface Static extends Member {
  group: number;
}

export interface UniqueValues {
  guilds: string[];
  primaryWeapons: string[];
  secondaryWeapons: string[];
}

export interface MemberCache {
  data: Member[] | null;
  timestamp: number | null;
  uniqueValues: UniqueValues | null;
}

export type { FilterValues } from "./components";
