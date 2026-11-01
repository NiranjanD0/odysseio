"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Navigation, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Itinerary, ItineraryStop } from "@/types";

interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
}

interface LeafletMapInstance {
  flyTo: (latlng: [number, number], zoom?: number, options?: Record<string, unknown>) => void;
  fitBounds: (bounds: [number, number][], options?: Record<string, unknown>) => void;
  getZoom: () => number;
}

interface AdventureMapProps {
  itinerary: Itinerary;
  activeStopId?: string;
  onMarkerClick?: (stopId: string) => void;
}

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
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
    Circle: unknown;
    Controller: React.ComponentType<{ onMap: (m: unknown) => void }>;
    L: unknown;
  } | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [map, setMap] = useState<LeafletMapInstance | null>(null);
  const watchIdRef = useRef<number | null>(null);

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

      const useMap = reactLeaflet.useMap;
      function Controller({ onMap }: { onMap: (m: unknown) => void }) {
        const m = useMap();
        useEffect(() => {
          if (m) onMap(m);
        }, [m, onMap]);
        return null;
      }

      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        Polyline: reactLeaflet.Polyline,
        Circle: reactLeaflet.Circle,
        Controller,
        L: L.default,
      });
    });
  }, []);

  const startTracking = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    const handleSuccess = (pos: GeolocationPosition) => {
      const loc: UserLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
      };
      setUserLocation(loc);
      setIsLocating(false);
      setIsTracking(true);
      return loc;
    };

    const handleError = (err: GeolocationPositionError) => {
      setIsLocating(false);
      if (err.code === err.PERMISSION_DENIED) {
        setLocationError("Location permission denied. Please allow location access in your browser.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setLocationError("Location information unavailable.");
      } else if (err.code === err.TIMEOUT) {
        setLocationError("Location request timed out. Please try again.");
      } else {
        setLocationError("Unable to retrieve location.");
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = handleSuccess(pos);
        if (map) {
          map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 16), { duration: 1.2 });
        }
      },
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  }, [map]);

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Auto-start tracking if permission was previously granted
  useEffect(() => {
    if (typeof window !== "undefined" && navigator?.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            startTracking();
          }
        })
        .catch(() => {
          // Permissions API query not supported in all browsers
        });
    }
  }, [startTracking]);

  const handleLocateClick = () => {
    if (userLocation && isTracking && map) {
      map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 16), {
        duration: 1,
      });
    } else {
      startTracking();
    }
  };

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
    Circle,
    Controller,
    L,
  } = MapComponents as {
    MapContainer: React.ComponentType<{
      center: [number, number];
      zoom: number;
      style?: React.CSSProperties;
      className?: string;
      ref?: (m: unknown) => void;
      children?: React.ReactNode;
    }>;
    TileLayer: React.ComponentType<{ url: string; attribution: string }>;
    Marker: React.ComponentType<{
      position: [number, number];
      icon?: unknown;
      zIndexOffset?: number;
      eventHandlers?: { click: () => void };
      children?: React.ReactNode;
    }>;
    Popup: React.ComponentType<{ children?: React.ReactNode }>;
    Polyline: React.ComponentType<{
      positions: [number, number][];
      pathOptions?: Record<string, unknown>;
    }>;
    Circle: React.ComponentType<{
      center: [number, number];
      radius: number;
      pathOptions?: Record<string, unknown>;
    }>;
    Controller: React.ComponentType<{ onMap: (m: unknown) => void }>;
    L: {
      divIcon: (opts: unknown) => unknown;
    };
  };

  const positions: [number, number][] = itinerary.stops
    .filter((s) => s.status !== "skipped")
    .map((s) => [s.place.coordinates.lat, s.place.coordinates.lng]);

  const activeStop = itinerary.stops.find((s) => s.id === activeStopId);
  const distanceToActiveStop =
    userLocation && activeStop
      ? calculateDistanceMeters(
          userLocation.lat,
          userLocation.lng,
          activeStop.place.coordinates.lat,
          activeStop.place.coordinates.lng
        )
      : null;

  const handleFitAll = () => {
    if (!map) return;
    const points: [number, number][] = itinerary.stops
      .filter((s) => s.status !== "skipped")
      .map((s) => [s.place.coordinates.lat, s.place.coordinates.lng]);

    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length === 1) {
      map.flyTo(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [50, 50] });
    }
  };

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

  const makeLiveLocationIcon = () => {
    return L.divIcon({
      html: `
        <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(37,99,235,0.28);animation:live-pulse 2s infinite ease-out;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2.5px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.35);position:relative;z-index:2;"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: "live-location-marker",
    });
  };

  return (
    <div className="relative w-full h-full rounded-[20px] overflow-hidden">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <style>{`
        @keyframes live-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          70% { transform: scale(2); opacity: 0; }
          100% { transform: scale(0.6); opacity: 0; }
        }
      `}</style>

      {/* Floating Map Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 bg-white/95 dark:bg-white/90 p-1 rounded-[14px] shadow-md border border-border-theme backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLocateClick}
            className={cn(
              "h-8 px-2.5 text-xs font-medium rounded-[10px] gap-1.5 transition-colors",
              isTracking && "text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40",
              !isTracking && "hover:bg-sage/40"
            )}
            title={isTracking ? "Center on my live location" : "Show my live location"}
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Navigation className={cn("w-3.5 h-3.5", isTracking ? "text-blue-600 fill-blue-600/30" : "text-text")} />
            )}
            <span>{isTracking ? "My location" : "Live location"}</span>
            {isTracking && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFitAll}
            className="h-8 px-2 text-xs font-medium rounded-[10px] gap-1 hover:bg-sage/40"
            title="Fit all stops and location on map"
          >
            <Maximize2 className="w-3.5 h-3.5 text-text" />
            <span className="hidden sm:inline">Fit all</span>
          </Button>
        </div>

        {locationError && (
          <div className="bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs px-3 py-1.5 rounded-[12px] shadow-sm max-w-xs flex items-center justify-between gap-2">
            <span>{locationError}</span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-red-400 hover:text-red-600 font-bold ml-1 text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <MapContainer
        ref={(m) => {
          if (m) setMap(m as unknown as LeafletMapInstance);
        }}
        center={[itinerary.centerCoordinates.lat, itinerary.centerCoordinates.lng]}
        zoom={14}
        style={{ width: "100%", height: "100%" }}
        className="rounded-[20px]"
      >
        <Controller onMap={(m) => setMap(m as LeafletMapInstance)} />
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
          .map((stop, i) => {
            const distanceToStop = userLocation
              ? calculateDistanceMeters(
                  userLocation.lat,
                  userLocation.lng,
                  stop.place.coordinates.lat,
                  stop.place.coordinates.lng
                )
              : null;

            return (
              <Marker
                key={stop.id}
                position={[stop.place.coordinates.lat, stop.place.coordinates.lng]}
                icon={makeIcon(stop, i)}
                eventHandlers={{ click: () => onMarkerClick?.(stop.id) }}
              >
                <Popup>
                  <div className="text-sm font-medium">{stop.place.name}</div>
                  <div className="text-xs text-gray-500">
                    {stop.arrivalTime} – {stop.departureTime}
                  </div>
                  {distanceToStop !== null && (
                    <div className="text-xs text-forest font-medium pt-1 border-t border-gray-100 mt-1">
                      {formatDistance(distanceToStop)} from your live location
                    </div>
                  )}
                </Popup>
              </Marker>
            );
          })}

        {userLocation && (
          <>
            {userLocation.accuracy && userLocation.accuracy > 0 && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy}
                pathOptions={{
                  color: "#2563EB",
                  fillColor: "#3B82F6",
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: "4 4",
                }}
              />
            )}
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={makeLiveLocationIcon()}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="py-1 px-0.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    Your Live Location
                  </div>
                  {userLocation.accuracy && (
                    <div className="text-xs text-text-muted">
                      GPS accuracy: ±{Math.round(userLocation.accuracy)}m
                    </div>
                  )}
                  {activeStop && distanceToActiveStop !== null && (
                    <div className="text-xs text-text pt-1.5 border-t border-border-theme flex items-center justify-between gap-2">
                      <span className="text-text-muted">To {activeStop.place.name}:</span>
                      <span className="font-semibold text-forest">
                        {formatDistance(distanceToActiveStop)}
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
