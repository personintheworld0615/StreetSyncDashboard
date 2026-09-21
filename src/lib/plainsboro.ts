import type { Report } from "@/lib/types";

/** Approximate Plainsboro Township, NJ bounds. */
const BOUNDS = {
  minLat: 40.31,
  maxLat: 40.36,
  minLng: -74.64,
  maxLng: -74.54,
} as const;

export function isPlainsboroReport(report: {
  location?: string | null;
  latitude?: number;
  longitude?: number;
}): boolean {
  const location = (report.location ?? "").toLowerCase();
  if (location.includes("plainsboro")) return true;

  const lat = report.latitude;
  const lng = report.longitude;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= BOUNDS.minLat &&
    lat <= BOUNDS.maxLat &&
    lng >= BOUNDS.minLng &&
    lng <= BOUNDS.maxLng
  ) {
    return true;
  }

  return false;
}

export function filterPlainsboroReports<T extends Report>(reports: T[]): T[] {
  return reports.filter(isPlainsboroReport);
}
