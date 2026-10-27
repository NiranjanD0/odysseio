/**
 * ODYSSEIO Frontend API / Service Layer
 *
 * All functions currently use mock data and localStorage for persistence.
 * The interface is designed so that, once the backend team delivers an agreed
 * API contract, the implementations can be swapped out without touching the UI.
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
  await delay(200);
  const savedIds = getSavedPlaceIds();
  return MOCK_PLACES.filter((p) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q));
    const matchesCity = !city || p.city === city;
    const matchesCat =
      categories.length === 0 || categories.includes(p.category);
    return matchesQuery && matchesCity && matchesCat;
  }).map((p) => ({ ...p, isSaved: savedIds.includes(p.id) }));
}

export async function getPlaceById(id: string): Promise<Place | null> {
  await delay(100);
  const savedIds = getSavedPlaceIds();
  const place = MOCK_PLACES.find((p) => p.id === id) ?? null;
  return place ? { ...place, isSaved: savedIds.includes(place.id) } : null;
}

// ─── Saved Places ──────────────────────────────────────────────────────────

function getSavedPlaceIds(): string[] {
  return lsGet<string[]>(KEYS.savedPlaces, []);
}

export function toggleSavedPlace(placeId: string): boolean {
  const ids = getSavedPlaceIds();
  const isSaved = ids.includes(placeId);
  lsSet(KEYS.savedPlaces, isSaved ? ids.filter((id) => id !== placeId) : [...ids, placeId]);
  return !isSaved;
}

export async function getSavedPlaces(): Promise<Place[]> {
  await delay(150);
  const ids = getSavedPlaceIds();
  return MOCK_PLACES.filter((p) => ids.includes(p.id)).map((p) => ({
    ...p,
    isSaved: true,
  }));
}

// ─── Destinations ──────────────────────────────────────────────────────────

export async function getDestinations(): Promise<Destination[]> {
  await delay(150);
  return MOCK_DESTINATIONS;
}

export async function getDestinationByCity(
  city: string
): Promise<Destination | null> {
  await delay(100);
  return MOCK_DESTINATIONS.find((d) => d.city === city) ?? null;
}

// ─── Itineraries / Journeys ────────────────────────────────────────────────

export async function getJourneys(): Promise<Itinerary[]> {
  await delay(200);
  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  // Merge stored with mock seeds (mock seeds only if not already overridden)
  const storedIds = new Set(stored.map((j) => j.id));
  const seeds = MOCK_ITINERARIES.filter((m) => !storedIds.has(m.id));
  return [...seeds, ...stored].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getItinerary(id: string): Promise<Itinerary | null> {
  await delay(150);
  const journeys = await getJourneys();
  return journeys.find((j) => j.id === id) ?? null;
}

export async function generateItinerary(
  values: PlanWizardValues
): Promise<Itinerary> {
  await delay(500); // simulate processing

  const dest = MOCK_DESTINATIONS.find((d) => d.city === values.destination);
  const availableMinutes = timeToMinutes(values.returnTime) - timeToMinutes(values.startTime) - values.safetyBufferMinutes;

  // Filter places by interests / city
  const candidates = MOCK_PLACES.filter(
    (p) =>
      p.city === values.destination &&
      (values.interests.length === 0 || values.interests.includes(p.category as never))
  );

  // Simple greedy scheduler
  const travelPerLeg = values.transport === "walking" ? 15 : values.transport === "cycling" ? 8 : 12;
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
    title: `${values.pace === "packed" ? "Packed" : values.pace === "relaxed" ? "Relaxed" : "Balanced"} Day in ${values.destination}`,
    city: values.destination,
    date: new Date().toISOString().split("T")[0],
    startTime: values.startTime,
    returnDeadline: values.returnTime,
    safetyBufferMinutes: values.safetyBufferMinutes,
    pace: values.pace,
    transport: values.transport,
    totalMinutes: availableMinutes,
    explorationMinutes: stops.reduce((acc, s) => acc + s.place.estimatedVisitMinutes, 0),
    travelMinutes: stops.reduce((acc, s) => acc + s.travelTimeFromPrev, 0),
    interests: values.interests,
    status: "upcoming",
    createdAt: new Date().toISOString(),
    centerCoordinates: dest?.coordinates ?? { lat: 48.856, lng: 2.352 },
    stops,
  };

  // Persist
  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  lsSet(KEYS.journeys, [itinerary, ...stored]);

  return itinerary;
}

export async function saveJourney(itinerary: Itinerary): Promise<void> {
  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  const exists = stored.findIndex((j) => j.id === itinerary.id);
  if (exists !== -1) {
    stored[exists] = itinerary;
  } else {
    stored.unshift(itinerary);
  }
  lsSet(KEYS.journeys, stored);
}

export async function deleteJourney(id: string): Promise<void> {
  await delay(200);
  const stored = lsGet<Itinerary[]>(KEYS.journeys, []);
  lsSet(KEYS.journeys, stored.filter((j) => j.id !== id));
}

export async function replanItinerary(
  itinerary: Itinerary,
  remainingMinutes: number
): Promise<Itinerary> {
  await delay(400);

  const updatedStops = itinerary.stops.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  );
  const pendingStops = itinerary.stops.filter((s) => s.status === "upcoming" || s.status === "current");

  let remaining = remainingMinutes;
  let currentTime = timeToMinutes(new Date().toTimeString().slice(0, 5));

  for (const stop of pendingStops) {
    const needed = stop.travelTimeFromPrev + stop.place.estimatedVisitMinutes;
    if (remaining < needed) {
      updatedStops.push({ ...stop, status: "skipped" });
    } else {
      remaining -= needed;
      const arrival = minutesToTime(currentTime + stop.travelTimeFromPrev);
      const departure = minutesToTime(currentTime + stop.travelTimeFromPrev + stop.place.estimatedVisitMinutes);
      currentTime += stop.travelTimeFromPrev + stop.place.estimatedVisitMinutes;
      updatedStops.push({ ...stop, arrivalTime: arrival, departureTime: departure });
    }
  }

  const updated: Itinerary = { ...itinerary, stops: updatedStops };
  await saveJourney(updated);
  return updated;
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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
