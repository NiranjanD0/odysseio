/**
 * ODYSSEIO Frontend API / Service Layer
 *
 * Full integration with the ODYSSEIO FastAPI Backend (http://localhost:8000/api/v1).
 * Gracefully falls back to local storage and curated seeds if the backend is unavailable.
 */

import {
  MOCK_DESTINATIONS,
  MOCK_ITINERARIES,
  MOCK_PLACES,
} from "./mock-data";
import type {
  Destination,
  Itinerary,
  ItineraryStop,
  Place,
  PlanWizardValues,
  UserPreferences,
} from "@/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Storage helpers ────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function lsGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Keys ──────────────────────────────────────────────────────────────────

const KEYS = {
  savedPlaces: "odysseio:savedPlaces",
  journeys: "odysseio:journeys",
  preferences: "odysseio:preferences",
} as const;

// ─── Places ────────────────────────────────────────────────────────────────

export async function searchPlaces(
  query: string = "",
  city: string = "",
  categories: string[] = []
): Promise<Place[]> {
  try {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    else params.set("city", "Paris"); // default anchor if no city specified
    if (query) params.set("query", query);
    if (categories.length > 0) params.set("categories", categories.join(","));

    const res = await fetch(`${BACKEND_URL}/places?${params.toString()}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.places)) {
        return data.places;
      }
    }
  } catch {
    // Backend offline; use resilient fallback
  }

  // Fallback to local mock dataset
  const savedIds = getSavedPlaceIds();
  return MOCK_PLACES.filter((p) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q));
    const matchesCity = !city || p.city.toLowerCase() === city.toLowerCase();
    const matchesCat =
      categories.length === 0 || categories.includes(p.category);
    return matchesQuery && matchesCity && matchesCat;
  }).map((p) => ({ ...p, isSaved: savedIds.includes(p.id) }));
}

export async function getPlaceById(id: string): Promise<Place | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/places/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to local search
  }

  const savedIds = getSavedPlaceIds();
  const place = MOCK_PLACES.find((p) => p.id === id) ?? null;
  return place ? { ...place, isSaved: savedIds.includes(place.id) } : null;
}

// ─── Saved Places ──────────────────────────────────────────────────────────

function getSavedPlaceIds(): string[] {
  return lsGet<string[]>(KEYS.savedPlaces, []);
}

export async function toggleSavedPlace(
  placeOrId: Place | string
): Promise<boolean> {
  const targetPlace: Place | null =
    typeof placeOrId === "string"
      ? (MOCK_PLACES.find((p) => p.id === placeOrId) ?? {
          id: placeOrId,
          name: "Saved Location",
          city: "Paris",
          country: "France",
          description: "",
          category: "culture",
          tags: [],
          coordinates: { lat: 48.8566, lng: 2.3522 },
          imageUrl: "",
          rating: 4.5,
          reviewCount: 10,
          estimatedVisitMinutes: 30,
          address: "",
          isSaved: true,
        })
      : placeOrId;

  // Local sync first
  const ids = getSavedPlaceIds();
  const isSaved = ids.includes(targetPlace.id);
  const nextSaved = !isSaved;
  lsSet(
    KEYS.savedPlaces,
    nextSaved
      ? [...ids, targetPlace.id]
      : ids.filter((id) => id !== targetPlace.id)
  );

  // Sync to FastAPI Backend
  try {
    await fetch(`${BACKEND_URL}/saved-places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place: targetPlace, notes: "" }),
    });
  } catch {
    // If backend unreachable, local sync succeeded
  }

  return nextSaved;
}

export async function getSavedPlaces(): Promise<Place[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/saved-places`, {
      cache: "no-store",
    });
    if (res.ok) {
      const places: Place[] = await res.json();
      if (Array.isArray(places) && places.length > 0) {
        // Sync local storage ids
        lsSet(KEYS.savedPlaces, places.map((p) => p.id));
        return places.map((p, idx) => ({
          ...p,
          imageUrl: p.imageUrl || MOCK_PLACES[idx % MOCK_PLACES.length].imageUrl,
          isSaved: true,
        }));
      }
    }
  } catch {
    // Backend offline; use local storage fallback
  }

  const ids = getSavedPlaceIds();
  return MOCK_PLACES.filter((p) => ids.includes(p.id)).map((p) => ({
    ...p,
    isSaved: true,
  }));
}

// ─── Destinations ──────────────────────────────────────────────────────────

export async function getDestinations(): Promise<Destination[]> {
  return MOCK_DESTINATIONS;
}

export async function getDestinationByCity(
  city: string
): Promise<Destination | null> {
  return (
    MOCK_DESTINATIONS.find(
      (d) => d.city.toLowerCase() === city.toLowerCase()
    ) ?? null
  );
}

// ─── Environmental Context ─────────────────────────────────────────────────

export async function getEnvironmentalContext(lat: number, lng: number) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/context?lat=${lat}&lng=${lng}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Not critical
  }
  return null;
}

// ─── Itineraries / Journeys ────────────────────────────────────────────────

export async function getJourneys(): Promise<Itinerary[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/journeys?limit=50&offset=0`, {
      cache: "no-store",
    });
    if (res.ok) {
      const backendJourneys: Itinerary[] = await res.json();
      if (Array.isArray(backendJourneys) && backendJourneys.length > 0) {
        return backendJourneys.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }
  } catch {
    // Fall back to local storage
  }

  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  const storedIds = new Set(stored.map((j) => j.id));
  const seeds = MOCK_ITINERARIES.filter((m) => !storedIds.has(m.id));
  return [...seeds, ...stored].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getItinerary(id: string): Promise<Itinerary | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/itineraries/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Backend offline; look up in local storage
  }

  const journeys = await getJourneys();
  return journeys.find((j) => j.id === id) ?? null;
}

export async function generateItinerary(
  values: PlanWizardValues
): Promise<Itinerary> {
  const dest =
    MOCK_DESTINATIONS.find(
      (d) => d.city.toLowerCase() === values.destination.toLowerCase()
    ) ?? MOCK_DESTINATIONS[0];

  const payload = {
    destination: values.destination,
    startLocation: values.startLocation || "City centre",
    startCoordinates: dest.coordinates,
    returnLocation: values.startLocation || "City centre",
    returnCoordinates: dest.coordinates,
    startTime: values.startTime,
    returnTime: values.returnTime,
    safetyBufferMinutes: values.safetyBufferMinutes,
    interests: values.interests,
    pace: values.pace,
    transport: values.transport,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/itineraries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const liveItinerary: Itinerary = await res.json();
      // Ensure each stop has a valid image
      liveItinerary.stops = liveItinerary.stops.map((stop, i) => {
        if (!stop.place.imageUrl) {
          const fallback = MOCK_PLACES[i % MOCK_PLACES.length];
          return {
            ...stop,
            place: { ...stop.place, imageUrl: fallback.imageUrl },
          };
        }
        return stop;
      });

      // Mirror to local storage
      const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
      lsSet(KEYS.journeys, [
        liveItinerary,
        ...stored.filter((j) => j.id !== liveItinerary.id),
      ]);
      return liveItinerary;
    }
  } catch {
    // Backend unreachable; use local fallback algorithm below
  }

  // Local fallback algorithm
  const availableMinutes =
    timeToMinutes(values.returnTime) -
    timeToMinutes(values.startTime) -
    values.safetyBufferMinutes;

  const candidates = MOCK_PLACES.filter(
    (p) =>
      p.city.toLowerCase() === values.destination.toLowerCase() &&
      (values.interests.length === 0 ||
        values.interests.includes(p.category as never))
  );

  const travelPerLeg =
    values.transport === "walking"
      ? 15
      : values.transport === "cycling"
      ? 8
      : 12;
  let remaining = availableMinutes;
  let currentTime = timeToMinutes(values.startTime);
  const stops: ItineraryStop[] = [];

  for (const place of candidates) {
    const leg = stops.length === 0 ? 0 : travelPerLeg;
    const needed = leg + place.estimatedVisitMinutes;
    if (remaining < needed) break;
    remaining -= needed;
    const arrival = minutesToTime(currentTime + leg);
    const departure = minutesToTime(currentTime + leg + place.estimatedVisitMinutes);
    currentTime += leg + place.estimatedVisitMinutes;
    stops.push({
      id: `s-${Date.now()}-${place.id}`,
      place,
      arrivalTime: arrival,
      departureTime: departure,
      travelTimeFromPrev: leg,
      status: "upcoming",
    });
  }

  const id = `itin-${Date.now()}`;
  const itinerary: Itinerary = {
    id,
    title: `${
      values.pace === "packed"
        ? "Packed"
        : values.pace === "relaxed"
        ? "Relaxed"
        : "Balanced"
    } Day in ${values.destination}`,
    city: values.destination,
    date: new Date().toISOString().split("T")[0],
    startTime: values.startTime,
    returnDeadline: values.returnTime,
    safetyBufferMinutes: values.safetyBufferMinutes,
    pace: values.pace,
    transport: values.transport,
    totalMinutes: availableMinutes,
    explorationMinutes: stops.reduce(
      (acc, s) => acc + s.place.estimatedVisitMinutes,
      0
    ),
    travelMinutes: stops.reduce((acc, s) => acc + s.travelTimeFromPrev, 0),
    interests: values.interests,
    status: "upcoming",
    createdAt: new Date().toISOString(),
    centerCoordinates: dest?.coordinates ?? { lat: 48.856, lng: 2.352 },
    stops,
  };

  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  lsSet(KEYS.journeys, [itinerary, ...stored]);
  return itinerary;
}

export async function saveJourney(itinerary: Itinerary): Promise<void> {
  // Sync locally
  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  const exists = stored.findIndex((j) => j.id === itinerary.id);
  if (exists !== -1) {
    stored[exists] = itinerary;
  } else {
    stored.unshift(itinerary);
  }
  lsSet(KEYS.journeys, stored);

  // Sync to Backend
  try {
    await fetch(`${BACKEND_URL}/journeys/${encodeURIComponent(itinerary.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itinerary),
    });
  } catch {
    // Backend offline; local update is intact
  }
}

export async function deleteJourney(id: string): Promise<void> {
  // Local deletion
  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  lsSet(KEYS.journeys, stored.filter((j) => j.id !== id));

  // Sync to Backend
  try {
    await fetch(`${BACKEND_URL}/journeys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {
    // Local deletion was already completed
  }
}

export async function addStopToLatestJourney(
  place: Place
): Promise<{ success: boolean; message: string; journeyId?: string }> {
  const journeys = await getJourneys();
  const active = journeys.find(
    (j) => j.status === "upcoming" || j.status === "in-progress"
  );
  if (!active) {
    return {
      success: false,
      message: "No active journey found. Start planning an adventure first!",
    };
  }
  // Check duplicates
  if (
    active.stops.some(
      (s) =>
        s.place.id === place.id ||
        s.place.name.toLowerCase() === place.name.toLowerCase()
    )
  ) {
    return {
      success: false,
      message: `"${place.name}" is already in this itinerary.`,
    };
  }

  const lastStop = active.stops[active.stops.length - 1];
  const lastDeparture = lastStop ? lastStop.departureTime : active.startTime;
  const [dh, dm] = lastDeparture.split(":").map(Number);
  const travelTime =
    active.transport === "walking" ? 15 : active.transport === "cycling" ? 8 : 12;
  const arrivalMin = dh * 60 + dm + travelTime;
  const departureMin = arrivalMin + place.estimatedVisitMinutes;

  const newStop: ItineraryStop = {
    id: `s-${Date.now()}-${place.id}`,
    place,
    arrivalTime: minutesToTime(arrivalMin),
    departureTime: minutesToTime(departureMin),
    travelTimeFromPrev: travelTime,
    status: "upcoming",
  };

  const updated: Itinerary = {
    ...active,
    stops: [...active.stops, newStop],
    explorationMinutes: active.explorationMinutes + place.estimatedVisitMinutes,
    travelMinutes: active.travelMinutes + travelTime,
  };

  await saveJourney(updated);
  return {
    success: true,
    message: `Added "${place.name}" to ${active.title}`,
    journeyId: active.id,
  };
}

export async function removeStopFromJourney(
  journeyId: string,
  stopId: string
): Promise<Itinerary | null> {
  const itin = await getItinerary(journeyId);
  if (!itin) return null;
  const removedStop = itin.stops.find((s) => s.id === stopId);
  const updatedStops = itin.stops.filter((s) => s.id !== stopId);
  const updated: Itinerary = {
    ...itin,
    stops: updatedStops,
    explorationMinutes: Math.max(
      0,
      itin.explorationMinutes - (removedStop?.place.estimatedVisitMinutes || 0)
    ),
    travelMinutes: Math.max(
      0,
      itin.travelMinutes - (removedStop?.travelTimeFromPrev || 0)
    ),
  };
  await saveJourney(updated);
  return updated;
}

export async function replanItinerary(
  itinerary: Itinerary,
  remainingMinutes: number
): Promise<Itinerary> {
  const completedStopIds = itinerary.stops
    .filter((s) => s.status === "completed")
    .map((s) => s.id);
  const skippedStopIds = itinerary.stops
    .filter((s) => s.status === "skipped")
    .map((s) => s.id);

  try {
    const res = await fetch(
      `${BACKEND_URL}/itineraries/${encodeURIComponent(itinerary.id)}/replan`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedStopIds,
          skippedStopIds,
          remainingMinutes: Math.max(5, remainingMinutes),
          currentCoordinates: itinerary.centerCoordinates,
          updatedPace: itinerary.pace,
          updatedTransport: itinerary.transport,
        }),
      }
    );

    if (res.ok) {
      const updated: Itinerary = await res.json();
      await saveJourney(updated);
      return updated;
    }
  } catch {
    // Backend offline; fallback to local replanner
  }

  // Local replan fallback
  const updatedStops = itinerary.stops.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  );
  const pendingStops = itinerary.stops.filter(
    (s) => s.status === "upcoming" || s.status === "current"
  );

  let remaining = remainingMinutes;
  let currentTime = timeToMinutes(new Date().toTimeString().slice(0, 5));

  for (const stop of pendingStops) {
    const needed = stop.travelTimeFromPrev + stop.place.estimatedVisitMinutes;
    if (remaining < needed) {
      updatedStops.push({ ...stop, status: "skipped" });
    } else {
      remaining -= needed;
      const arrival = minutesToTime(currentTime + stop.travelTimeFromPrev);
      const departure = minutesToTime(
        currentTime + stop.travelTimeFromPrev + stop.place.estimatedVisitMinutes
      );
      currentTime += stop.travelTimeFromPrev + stop.place.estimatedVisitMinutes;
      updatedStops.push({
        ...stop,
        arrivalTime: arrival,
        departureTime: departure,
      });
    }
  }

  const updated: Itinerary = { ...itinerary, stops: updatedStops };
  await saveJourney(updated);
  return updated;
}

// ─── Telegram Notifications ────────────────────────────────────────────────

export async function sendTelegramNotification(
  itineraryId: string,
  chatId?: string,
  customMessage?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/notifications/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itineraryId,
        chatId: chatId || undefined,
        customMessage: customMessage || undefined,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline
  }
  return { success: false, message: "Could not send Telegram notification." };
}

// ─── Preferences ──────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPreferences = {
  pace: "balanced",
  transport: "walking",
  interests: ["culture", "food"],
  safetyBufferMinutes: 15,
};

export function getUserPreferences(): UserPreferences {
  return lsGet<UserPreferences>(KEYS.preferences, DEFAULT_PREFS);
}

export function saveUserPreferences(prefs: UserPreferences): void {
  lsSet(KEYS.preferences, prefs);
}

export function resetDemoData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.savedPlaces);
  localStorage.removeItem(KEYS.journeys);
  localStorage.removeItem(KEYS.preferences);
}

// ─── Utils ─────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
