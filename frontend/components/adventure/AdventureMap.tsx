"use client";

import { useEffect, useState } from "react";
import type { Itinerary, ItineraryStop } from "@/types";

interface AdventureMapProps {
  itinerary: Itinerary;
  activeStopId?: string;
  onMarkerClick?: (stopId: string) => void;
}

export function AdventureMap({
  itinerary,
  activeStopId,
  onMarkerClick,
}: AdventureMapProps) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: unknown;
    TileLayer: unknown;
    Marker: unknown;
    Popup: unknown;
    Polyline: unknown;
    L: unknown;
  } | null>(null);

  useEffect(() => {
    // Leaflet must be imported client-side only
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
      // Fix default icon in Next.js
      (L.default.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl = undefined;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        Polyline: reactLeaflet.Polyline,
        L: L.default,
      });
    });
  }, []);

  if (!MapComponents) {
    return (
      <div className="w-full h-full bg-sage/20 rounded-[20px] flex items-center justify-center">
        <div className="text-text-muted text-sm flex flex-col items-center gap-2">
          <span className="text-3xl animate-pulse">🗺️</span>
          <span>Loading map…</span>
        </div>
      </div>
    );
  }

  const {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    L,
  } = MapComponents as {
    MapContainer: React.ComponentType<{ center: [number, number]; zoom: number; style?: React.CSSProperties; className?: string; children?: React.ReactNode }>;
    TileLayer: React.ComponentType<{ url: string; attribution: string }>;
    Marker: React.ComponentType<{ position: [number, number]; icon?: unknown; eventHandlers?: { click: () => void }; children?: React.ReactNode }>;
    Popup: React.ComponentType<{ children?: React.ReactNode }>;
    Polyline: React.ComponentType<{ positions: [number, number][]; pathOptions?: Record<string, unknown> }>;
    L: { divIcon: (opts: unknown) => unknown };
  };

  const positions: [number, number][] = itinerary.stops
    .filter((s) => s.status !== "skipped")
    .map((s) => [s.place.coordinates.lat, s.place.coordinates.lng]);

  const makeIcon = (stop: ItineraryStop, index: number) => {
    const isActive = stop.id === activeStopId;
    const isCompleted = stop.status === "completed";
    const bgColor = isCompleted ? "#315B48" : isActive ? "#F5DCCF" : "#FFFFFF";
    const textColor = isCompleted ? "#FFFFFF" : "#24352B";
    const border = isActive ? "2px solid #315B48" : "1px solid #DEDCCF";
    return L.divIcon({
      html: `<div style="width:32px;height:32px;border-radius:50%;background:${bgColor};border:${border};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:${textColor};box-shadow:0 2px 8px rgba(0,0,0,0.15);">${index + 1}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: "",
    });
  };

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={[itinerary.centerCoordinates.lat, itinerary.centerCoordinates.lng]}
        zoom={14}
        style={{ width: "100%", height: "100%" }}
        className="rounded-[20px]"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: "#315B48", weight: 3, opacity: 0.6, dashArray: "8 6" }}
          />
        )}
        {itinerary.stops
          .filter((s) => s.status !== "skipped")
          .map((stop, i) => (
            <Marker
              key={stop.id}
              position={[stop.place.coordinates.lat, stop.place.coordinates.lng]}
              icon={makeIcon(stop, i)}
              eventHandlers={{ click: () => onMarkerClick?.(stop.id) }}
            >
              <Popup>
                <div className="text-sm font-medium">{stop.place.name}</div>
                <div className="text-xs text-gray-500">{stop.arrivalTime} – {stop.departureTime}</div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </>
  );
}
