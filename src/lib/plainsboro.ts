import { PLAINSBORO_BOUNDARY } from "@/lib/plainsboro-boundary";
import type { Report } from "@/lib/types";

function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isReportInJurisdiction(report: {
  location?: string | null;
  latitude?: number;
  longitude?: number;
}): boolean {
  const lat = report.latitude;
  const lng = report.longitude;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  ) {
    return isPointInPolygon(lat, lng, PLAINSBORO_BOUNDARY);
  }
  const location = (report.location ?? "").toLowerCase();
  return location.includes("plainsboro");
}

export function isPlainsboroReport(report: {
  location?: string | null;
  latitude?: number;
  longitude?: number;
}): boolean {
  return isReportInJurisdiction(report);
}

export function filterPlainsboroReports<T extends Report>(reports: T[]): T[] {
  return reports.filter(isReportInJurisdiction);
}
