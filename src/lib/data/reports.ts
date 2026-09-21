import type { Report } from "@/lib/types";

/** Plainsboro, NJ — default map focus for the ops console. */
export const MAP_CENTER = { lat: 40.3334, lng: -74.6004 } as const;
export const MAP_ZOOM = 14 as const;

export const SYNTHETIC_REPORTS: Report[] = [
  {
    id: 1042,
    description:
      "Large pothole spanning the right lane near the shopping center entrance.",
    category: "Road Damage",
    latitude: 40.3425,
    longitude: -74.5646,
    location: "20 Woodland Dr, Plainsboro, NJ",
    image: null,
    time: "2026-07-25T14:22:00Z",
    status: "Open",
    user_id: 12,
    isDraft: false,
    synthetic: true,
  },
  {
    id: 1041,
    description:
      "Wheelchair ramp curb cut blocked by construction debris. No alternate accessible path.",
    category: "Accessibility",
    latitude: 40.3333,
    longitude: -74.5862,
    location: "641 Plainsboro Rd, Plainsboro, NJ",
    image: null,
    time: "2026-07-25T11:05:00Z",
    status: "Open",
    user_id: 8,
    isDraft: false,
    synthetic: true,
  },
  {
    id: 1038,
    description: "Broken sidewalk slab creating a trip hazard on the school walking route.",
    category: "Accessibility",
    latitude: 40.3263,
    longitude: -74.575,
    location: "Deer Creek Dr, Plainsboro, NJ",
    image: null,
    time: "2026-07-24T18:40:00Z",
    status: "In Progress",
    user_id: 21,
    isDraft: false,
    synthetic: true,
  },
  {
    id: 1035,
    description: "Storm drain clogged; standing water after light rain covering half the bike lane.",
    category: "Environmental",
    latitude: 40.3312,
    longitude: -74.5921,
    location: "Schalks Crossing Rd, Plainsboro, NJ",
    image: null,
    time: "2026-07-24T09:15:00Z",
    status: "In Progress",
    user_id: 4,
    isDraft: false,
    synthetic: true,
  },
  {
    id: 1031,
    description: "Faded crosswalk paint at the elementary school crossing.",
    category: "Public Works",
    latitude: 40.3288,
    longitude: -74.6015,
    location: "Wyndhurst Dr, Plainsboro, NJ",
    image: null,
    time: "2026-07-23T16:00:00Z",
    status: "Open",
    user_id: 15,
    isDraft: false,
    synthetic: true,
  },
  {
    id: 1012,
    description: "Small crack network on residential cul-de-sac; cosmetic for now.",
    category: "Road Damage",
    latitude: 40.3361,
    longitude: -74.5784,
    location: "Hunters Glen Dr, Plainsboro, NJ",
    image: null,
    time: "2026-07-20T10:20:00Z",
    status: "Resolved",
    user_id: 7,
    isDraft: false,
    synthetic: true,
  },
];

export function countByStatus(reports: Report[]) {
  return {
    Open: reports.filter((r) => r.status === "Open").length,
    "In Progress": reports.filter((r) => r.status === "In Progress").length,
    Resolved: reports.filter((r) => r.status === "Resolved").length,
  };
}
