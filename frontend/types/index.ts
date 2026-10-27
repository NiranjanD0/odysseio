export type Category =
  | "cafe"
  | "food"
  | "culture"
  | "history"
  | "nature"
  | "architecture"
  | "photography"
  | "shopping"
  | "hidden-gem"
  | "art"
  | "nightlife";

export type Pace = "relaxed" | "balanced" | "packed";
export type Transport = "walking" | "public" | "cycling" | "mixed";
export type JourneyStatus = "upcoming" | "in-progress" | "completed";
export type StopStatus = "upcoming" | "current" | "completed" | "skipped";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface OpeningHours {
  open: string;
  close: string;
  days: string;
}

export interface Place {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  category: Category;
  tags: string[];
  coordinates: Coordinates;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  estimatedVisitMinutes: number;
  openingHours?: OpeningHours;
  address: string;
  isSaved?: boolean;
}

export interface ItineraryStop {
  id: string;
  place: Place;
  arrivalTime: string; // HH:MM
  departureTime: string; // HH:MM
  travelTimeFromPrev: number; // minutes
  status: StopStatus;
  notes?: string;
}

export interface Itinerary {
  id: string;
  title: string;
  city: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  returnDeadline: string; // HH:MM
  safetyBufferMinutes: number;
  stops: ItineraryStop[];
  pace: Pace;
  transport: Transport;
  totalMinutes: number;
  explorationMinutes: number;
  travelMinutes: number;
  interests: Category[];
  status: JourneyStatus;
  createdAt: string;
  centerCoordinates: Coordinates;
}

export interface Destination {
  id: string;
  city: string;
  country: string;
  imageUrl: string;
  description: string;
  highlights: string[];
  coordinates: Coordinates;
  popularCategories: Category[];
  placeCount: number;
}

export interface PlanWizardValues {
  destination: string;
  startLocation: string;
  startTime: string;
  returnTime: string;
  safetyBufferMinutes: number;
  interests: Category[];
  pace: Pace;
  transport: Transport;
}

export interface UserPreferences {
  pace: Pace;
  transport: Transport;
  interests: Category[];
  safetyBufferMinutes: number;
}
