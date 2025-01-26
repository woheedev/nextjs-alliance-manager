export type ClassType =
  | "Tank"
  | "Ranged"
  | "Healer"
  | "Bomber"
  | "Melee"
  | "NO_CLASS";

export const CLASS_COLORS = {
  Tank: "blue",
  Ranged: "yellow",
  Healer: "pink",
  Bomber: "green",
  Melee: "orange",
  NO_CLASS: "gray",
} as const;

export const CLASS_ORDER = [
  "Tank",
  "Melee",
  "Ranged",
  "Bomber",
  "Healer",
  "NO_CLASS",
] as const;

export type ClassColors = typeof CLASS_COLORS;
