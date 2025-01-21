import type { Member, VodTracking, Static, UniqueValues } from "./index";
import type { DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";

export interface FilterValues {
  guild: string;
  primary_weapon: string;
  secondary_weapon: string;
  has_thread: string;
}

export interface FiltersProps {
  onFilterChange: (newFilters: (prev: FilterValues) => FilterValues) => void;
  uniqueValues: UniqueValues;
  disabled?: boolean;
}

export interface MemberItemProps {
  member: Member;
  index: number;
  isUpdateInProgress: boolean;
}

export interface StaticGroupProps {
  group: number;
  members: Member[];
  isUpdating: boolean;
}

export interface VodTableProps {
  members: Member[];
  vodTracking: Record<string, VodTracking>;
  onVodCheck: (
    discordId: string,
    checked: boolean,
    primary: string,
    secondary: string
  ) => Promise<void>;
  onGearCheck: (
    discordId: string,
    checked: boolean,
    primary: string,
    secondary: string
  ) => Promise<void>;
  onNotesChange: (
    discordId: string,
    notes: string,
    primary: string,
    secondary: string
  ) => void;
  onGearScoreChange: (
    discordId: string,
    score: string,
    primary: string,
    secondary: string
  ) => void;
  updatingVods: Set<string>;
}

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export interface DroppableProps {
  provided: DroppableProvided;
}

export interface DraggableProps {
  provided: DraggableProvided;
}
