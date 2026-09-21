import {
  Accessibility,
  Construction,
  Landmark,
  Leaf,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_LABELS: Record<string, string> = {
  "Road Damage": "Roads",
  "Public Works": "Town",
  Environmental: "Environment",
  Accessibility: "Accessibility",
  Other: "Other",
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Road Damage": Construction,
  "Public Works": Landmark,
  Environmental: Leaf,
  Accessibility: Accessibility,
  Other: MoreHorizontal,
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? MoreHorizontal;
}
