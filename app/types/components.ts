import type { Member, VodTracking, Static, UniqueValues } from "./index";
import type { DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";
import type { ClassColors } from "./classes";

export interface FilterValues {
  guild: string;
  primary_weapon: string;
  secondary_weapon: string;
  has_thread: string;
  nameSearch: string;
  showEditable: boolean;
}

export interface FiltersProps {
  onFilterChange: (newFilters: (prev: FilterValues) => FilterValues) => void;
  uniqueValues: UniqueValues;
  disabled?: boolean;
}

export interface MemberItemProps {
  member: Member;
  index: number;
  updatingMembers?: Set<string>;
  classColors: ClassColors;
}

export interface StaticGroupProps {
  group: number;
  members: Member[];
  updatingMembers?: Set<string>;
  classColors: ClassColors;
  selectedGuild: string;
  rowMaxMembers?: number;
}

export interface VodTableProps {
  members: Member[];
  vodTracking: Record<string, VodTracking>;
  notesInput: Record<string, string>;
  gearScoreInput: Record<string, string>;
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

export interface MemberListProps {
  members: Member[];
  updatingMembers: Set<string>;
  classColors: ClassColors;
}
