"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_CENTER } from "@/lib/data/reports";
import type { MapMode, Report } from "@/lib/types";
import { SeverityBadge, StatusBadge } from "@/components/dashboard/badges";

type Props = {
  reports: Report[];
  selectedId: number | null;
  mapMode: MapMode;
  onSelect: (id: number) => void;
};

const severityColor: Record<Report["severity"], string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#64748b",
};

const heatRgb: Record<Report["severity"], string> = {
  high: "220, 38, 38",
  medium: "245, 158, 11",
  low: "33, 150, 243",
};

function FitBounds({ reports }: { reports: Report[] }) {
  const map = useMap();
  useEffect(() => {
    if (!reports.length) {
      map.setView([MAP_CENTER.lat, MAP_CENTER.lng], 12);
      return;
    }
    const bounds = L.latLngBounds(
      reports.map((r) => [r.latitude, r.longitude] as [number, number])
    );
    map.fitBounds(bounds.pad(0.18), { animate: false });
  }, [map, reports]);
  return null;
}

function HeatLayer({ reports }: { reports: Report[] }) {
  const map = useMap();

  useEffect(() => {
    const HeatCanvas = L.Layer.extend({
      onAdd(this: L.Layer & { _canvas?: HTMLCanvasElement; _redraw: () => void }) {
        const canvas = L.DomUtil.create(
          "canvas",
          "leaflet-layer"
        ) as HTMLCanvasElement;
        canvas.style.pointerEvents = "none";
        this._canvas = canvas;
        map.getPanes().overlayPane.appendChild(canvas);
        map.on("moveend zoomend resize viewreset", this._redraw, this);
        this._redraw();
      },
      onRemove(this: L.Layer & { _canvas?: HTMLCanvasElement; _redraw: () => void }) {
        if (this._canvas?.parentNode) {
          this._canvas.parentNode.removeChild(this._canvas);
        }
        map.off("moveend zoomend resize viewreset", this._redraw, this);
      },
      _redraw(this: L.Layer & { _canvas?: HTMLCanvasElement }) {
        const canvas = this._canvas;
        if (!canvas) return;
        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const r of reports) {
          const p = map.latLngToContainerPoint([r.latitude, r.longitude]);
          const radius =
            r.severity === "high" ? 64 : r.severity === "medium" ? 50 : 38;
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
          const rgb = heatRgb[r.severity];
          gradient.addColorStop(0, `rgba(${rgb}, 0.62)`);
          gradient.addColorStop(0.45, `rgba(${rgb}, 0.28)`);
          gradient.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });

    const layer = new HeatCanvas();
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, reports]);

  return null;
}

export function ReportsMap({ reports, selectedId, mapMode, onSelect }: Props) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lng]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds reports={reports} />
        {mapMode === "heatmap" ? (
          <HeatLayer reports={reports} />
        ) : (
          reports.map((report) => (
            <CircleMarker
              key={report.id}
              center={[report.latitude, report.longitude]}
              radius={report.id === selectedId ? 11 : 8}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: severityColor[report.severity],
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
                    <SeverityBadge severity={report.severity} />
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))
        )}
        {mapMode === "heatmap" &&
          reports.map((report) => (
            <CircleMarker
              key={`hit-${report.id}`}
              center={[report.latitude, report.longitude]}
              radius={18}
              pathOptions={{
                color: "transparent",
                fillColor: "#2196f3",
                fillOpacity: 0.01,
                weight: 0,
              }}
              eventHandlers={{ click: () => onSelect(report.id) }}
            />
          ))}
      </MapContainer>
    </div>
  );
}
