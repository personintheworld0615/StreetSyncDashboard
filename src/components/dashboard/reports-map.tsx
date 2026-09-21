"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  CircleMarker,
  Polygon,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_CENTER, MAP_ZOOM } from "@/lib/data/reports";
import { PLAINSBORO_BOUNDARY } from "@/lib/plainsboro-boundary";
import type { Report, ReportStatus } from "@/lib/types";
import { StatusBadge } from "@/components/dashboard/badges";

type Props = {
  reports: Report[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

const statusColor: Record<ReportStatus, string> = {
  Open: "#4B5563",
  "In Progress": "#EA580C",
  Resolved: "#0F766E",
};

function hasValidCoords(report: Report) {
  return (
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    !(report.latitude === 0 && report.longitude === 0)
  );
}

function InitialView({ reports }: { reports: Report[] }) {
  const map = useMap();
  useEffect(() => {
    const plainsboro = L.latLngBounds(PLAINSBORO_BOUNDARY);
    const mappable = reports.filter(hasValidCoords);

    if (!mappable.length) {
      map.fitBounds(plainsboro.pad(0.08), { animate: false });
      return;
    }

    const reportBounds = L.latLngBounds(
      mappable.map((r) => [r.latitude, r.longitude] as [number, number])
    );

    // Prefer Plainsboro if every pin sits inside it; otherwise frame the pins.
    const allInPlainsboro = mappable.every((r) =>
      plainsboro.contains([r.latitude, r.longitude])
    );

    if (allInPlainsboro) {
      map.fitBounds(plainsboro.pad(0.08), { animate: false });
    } else {
      map.fitBounds(reportBounds.pad(0.35), {
        animate: false,
        maxZoom: 15,
      });
    }
  }, [map, reports]);
  return null;
}

function FocusSelected({
  report,
}: {
  report: Report | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!report || !hasValidCoords(report)) return;
    map.flyTo([report.latitude, report.longitude], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.6,
    });
  }, [map, report]);
  return null;
}

export function ReportsMap({ reports, selectedId, onSelect }: Props) {
  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const mappable = reports.filter(hasValidCoords);

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lng]}
        zoom={MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InitialView reports={mappable} />
        <FocusSelected report={selected} />
        <Polygon
          positions={PLAINSBORO_BOUNDARY}
          pathOptions={{
            color: "#E53935",
            weight: 3,
            fillColor: "#E53935",
            fillOpacity: 0.06,
            opacity: 0.95,
          }}
        />
        {mappable.map((report) => (
          <CircleMarker
            key={report.id}
            center={[report.latitude, report.longitude]}
            radius={report.id === selectedId ? 11 : 8}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: statusColor[report.status],
              fillOpacity: report.id === selectedId ? 1 : 0.85,
            }}
            eventHandlers={{
              click: () => onSelect(report.id),
            }}
          >
            <Popup>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-[#152033]">#{report.id}</p>
                <p className="max-w-[200px] text-[#5b677a]">{report.description}</p>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={report.status} />
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
