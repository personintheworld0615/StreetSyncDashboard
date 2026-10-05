"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  Polygon,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_CENTER, MAP_STREET_ZOOM, MAP_ZOOM } from "@/lib/data/reports";
import { PLAINSBORO_BOUNDARY } from "@/lib/plainsboro-boundary";
import { isReportInJurisdiction } from "@/lib/plainsboro";
import type { Report, ReportStatus } from "@/lib/types";

type Props = {
  reports: Report[];
  selectedId: number | null;
  focusSeq: number;
  onSelect: (id: number) => void;
};

const statusColor: Record<ReportStatus, string> = {
  Open: "#2563EB",
  "In Progress": "#EA580C",
  Pending: "#D97706",
  Resolved: "#0F766E",
};

function createReportIcon(report: Report, isSelected: boolean): L.DivIcon {
  const inJurisdiction = isReportInJurisdiction(report);

  let mainColor = statusColor[report.status];
  let isFlashing = false;

  if (!inJurisdiction) {
    isFlashing = true;
    mainColor = "#EF4444";
  }

  if (isSelected) {
    let extraPulseClass = "";
    if (isFlashing) {
      extraPulseClass = " ss-lockon-pulse-red";
    }

    const html = `
      <div class="ss-lockon" style="--marker-color: ${mainColor};">
        <span class="ss-lockon-pulse${extraPulseClass}"></span>
        <span class="ss-lockon-pulse ss-lockon-pulse-delay${extraPulseClass}"></span>
        <span class="ss-lockon-dot"></span>
      </div>
    `;

    return L.divIcon({
      className: "ss-lockon-wrapper",
      html,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });
  }

  if (isFlashing) {
    const html = `
      <div class="ss-marker-container">
        <span class="ss-marker-flashing-ring"></span>
        <span class="ss-marker-flashing"></span>
      </div>
    `;
    return L.divIcon({
      className: "ss-marker-icon-wrapper",
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  const html = `
    <div class="ss-marker-container">
      <span class="ss-marker-dot" style="background-color: ${mainColor};"></span>
    </div>
  `;
  return L.divIcon({
    className: "ss-marker-icon-wrapper",
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function getZIndex(report: Report, isSelected: boolean): number {
  if (isSelected) return 1000;
  const inJurisdiction = isReportInJurisdiction(report);
  if (!inJurisdiction) {
    return 500;
  }
  return 200;
}

function hasValidCoords(report: Report) {
  return (
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    !(report.latitude === 0 && report.longitude === 0)
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function BindMap({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

function InitialView() {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current) return;
    map.fitBounds(L.latLngBounds(PLAINSBORO_BOUNDARY).pad(0.04), {
      animate: false,
    });
    didFit.current = true;
  }, [map]);

  return null;
}

function offsetForDetailPanel(
  map: L.Map,
  latlng: L.LatLngExpression,
  zoom: number
) {
  const overlay = document.querySelector(".ss-detail-overlay");
  const overlayWidth = overlay?.getBoundingClientRect().width ?? 340;
  const size = map.getSize();
  if (overlayWidth < 80 || size.x <= overlayWidth + 80) return latlng;
  const projected = map.project(latlng, zoom);
  projected.x += overlayWidth / 2;
  return map.unproject(projected, zoom);
}

function FocusSelected({
  report,
  focusSeq,
}: {
  report: Report | null;
  focusSeq: number;
}) {
  const map = useMap();
  const lastSeq = useRef(0);

  useEffect(() => {
    if (!report || !hasValidCoords(report) || focusSeq === 0) return;
    if (focusSeq === lastSeq.current) return;
    lastSeq.current = focusSeq;

    const reduce = prefersReducedMotion();
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      const zoom = Math.min(map.getMaxZoom(), MAP_STREET_ZOOM);
      const target = offsetForDetailPanel(
        map,
        [report.latitude, report.longitude],
        zoom
      );
      if (reduce) {
        map.setView(target, zoom, { animate: false });
        return;
      }
      map.flyTo(target, zoom, {
        animate: true,
        duration: 1.15,
        easeLinearity: 0.22,
      });
    }, 40);

    return () => window.clearTimeout(id);
  }, [map, report, focusSeq]);

  return null;
}

export function ReportsMap({
  reports,
  selectedId,
  focusSeq,
  onSelect,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const mappable = reports.filter(hasValidCoords);

  function fitTownship() {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(PLAINSBORO_BOUNDARY).pad(0.04);
    if (prefersReducedMotion()) {
      map.fitBounds(bounds, { animate: false });
      return;
    }
    map.flyToBounds(bounds, { duration: 0.85, easeLinearity: 0.25 });
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lng]}
        zoom={MAP_ZOOM}
        maxZoom={MAP_STREET_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={MAP_STREET_ZOOM}
          maxNativeZoom={19}
        />
        <BindMap mapRef={mapRef} />
        <InitialView />
        <FocusSelected report={selected} focusSeq={focusSeq} />
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
        {mappable.map((report) => {
          const isSelected = report.id === selectedId;
          return (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={createReportIcon(report, isSelected)}
              zIndexOffset={getZIndex(report, isSelected)}
              eventHandlers={{
                click: () => onSelect(report.id),
              }}
            />
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute top-3 right-3 z-[1000]">
        <button
          type="button"
          onClick={fitTownship}
          className="pointer-events-auto h-10 rounded-full bg-white px-3.5 text-[13px] font-semibold text-[#111827] shadow-[0_2px_8px_rgb(17_24_39_/_0.12)] ring-1 ring-[#E5E7EB] transition-colors hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
        >
          Township
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] hidden sm:block">
        <div className="pointer-events-auto rounded-xl bg-white/95 p-2.5 shadow-md ring-1 ring-black/5 backdrop-blur-xs text-[11px] font-medium text-[#374151] space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">
            Map Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#2563EB] ring-1 ring-white" />
            <span>Open</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#EA580C] ring-1 ring-white" />
            <span>Active (In Progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#D97706] ring-1 ring-white" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#0F766E] ring-1 ring-white" />
            <span>Resolved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#EF4444]" />
            </span>
            <span>Out of Jurisdiction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
