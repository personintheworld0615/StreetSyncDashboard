import { isPlainsboroReport } from "@/lib/plainsboro";
import { reportTitle } from "@/lib/format";
import type { Report } from "@/lib/types";
import type { NearbyReport } from "@/lib/ai/types";

function hasValidCoords(report: Report) {
  return (
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    !(report.latitude === 0 && report.longitude === 0)
  );
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(sin)));
}

export function nearbyReports(report: Report, queue: Report[], limit = 6): NearbyReport[] {
  if (!hasValidCoords(report)) return [];
  return queue
    .filter((row) => row.id !== report.id && hasValidCoords(row))
    .map((row) => ({
      id: row.id,
      title: reportTitle(row),
      category: row.category,
      location: row.location,
      status: row.status,
      meters: Math.round(
        haversineMeters(
          { lat: report.latitude, lng: report.longitude },
          { lat: row.latitude, lng: row.longitude }
        )
      ),
    }))
    .filter((row) => row.meters <= 250)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

export function gisInTownship(report: Report) {
  return isPlainsboroReport(report);
}
