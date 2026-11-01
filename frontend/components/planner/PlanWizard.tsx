"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Clock,
  MapPin,
  CloudSun,
  Bike,
  Star,
  Check,
  Compass,
} from "lucide-react";
import type { Category, Pace, Transport, EnvironmentalContext, Place } from "@/types";
import { CATEGORY_META, formatDuration } from "@/lib/utils";
import {
  generateItinerary,
  getUserPreferences,
  getEnvironmentalContext,
  searchPlaces,
} from "@/lib/api";
import { MOCK_DESTINATIONS } from "@/lib/mock-data";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  destination: z.string().min(1, "Please select a destination"),
  startLocation: z.string().min(1, "Please enter an origin starting location"),
  returnLocation: z.string().optional(),
  startTime: z.string().min(1, "Required"),
  returnTime: z.string().min(1, "Required"),
  safetyBufferMinutes: z.number().min(0).max(60),
  interests: z.array(z.string()).min(1, "Pick at least one interest"),
  pace: z.enum(["relaxed", "balanced", "packed"] as const),
  transport: z.enum(["walking", "public", "cycling", "mixed"] as const),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Area & Origin", "Timing", "Style", "Pick Places", "Summary"];

const CATEGORIES: Category[] = [
  "cafe", "food", "culture", "history", "nature",
  "architecture", "photography", "shopping", "hidden-gem", "art",
];

const PACE_OPTIONS: { value: Pace; label: string; desc: string }[] = [
  { value: "relaxed", label: "Relaxed", desc: "2–3 stops, plenty of time" },
  { value: "balanced", label: "Balanced", desc: "4–5 stops, comfortable pace" },
  { value: "packed", label: "Packed", desc: "6+ stops, maximise exploration" },
];

const TRANSPORT_OPTIONS: { value: Transport; label: string; emoji: string }[] = [
  { value: "walking", label: "Walking", emoji: "🚶" },
  { value: "public", label: "Public Transit", emoji: "🚇" },
  { value: "cycling", label: "Cycling", emoji: "🚲" },
  { value: "mixed", label: "Mixed", emoji: "🔀" },
];

export function PlanWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [envContext, setEnvContext] = useState<EnvironmentalContext | null>(null);

  // Place selection state (up to 3 stops)
  const [candidatePlaces, setCandidatePlaces] = useState<Place[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [customDurations, setCustomDurations] = useState<Record<string, number>>({});

  const initialDestination = searchParams?.get("destination") ?? searchParams?.get("city") ?? "";
  const initialStartLocation = searchParams?.get("startLocation") ?? searchParams?.get("place") ?? "City centre";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    trigger,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      destination: initialDestination,
      startLocation: initialStartLocation,
      returnLocation: initialStartLocation,
      startTime: "09:00",
      returnTime: "13:00",
      safetyBufferMinutes: 15,
      interests: ["food", "culture"],
      pace: "balanced",
      transport: "walking",
    },
  });

  // Pre-fill preferences on mount
  useEffect(() => {
    const prefs = getUserPreferences();
    reset({
      destination: initialDestination,
      startLocation: initialStartLocation,
      returnLocation: initialStartLocation,
      startTime: "09:00",
      returnTime: "13:00",
      safetyBufferMinutes: prefs.safetyBufferMinutes ?? 15,
      interests: (prefs.interests && prefs.interests.length > 0) ? prefs.interests : ["food", "culture"],
      pace: prefs.pace ?? "balanced",
      transport: prefs.transport ?? "walking",
    });
  }, [initialDestination, initialStartLocation, reset]);

  const watchAll = useWatch({ control });
  const startTime = watchAll.startTime ?? "09:00";
  const returnTime = watchAll.returnTime ?? "13:00";
  const safetyBufferMinutes = watchAll.safetyBufferMinutes ?? 15;

  // Available time calculation
  const availableMinutes = (() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [rh, rm] = returnTime.split(":").map(Number);
    let total = (rh * 60 + rm) - (sh * 60 + sm);
    if (total <= 0) total += 24 * 60;
    return Math.max(0, total - safetyBufferMinutes);
  })();

  // Fetch live context for selected destination
  useEffect(() => {
    const dest = MOCK_DESTINATIONS.find(
      (d) => d.city.toLowerCase() === (watchAll.destination || "").toLowerCase()
    );
    if (dest) {
      getEnvironmentalContext(dest.coordinates.lat, dest.coordinates.lng).then(setEnvContext);
    }
  }, [watchAll.destination]);

  // Fetch candidate places when transitioning to the place-selection step
  const loadCandidates = useCallback(async () => {
    if (!watchAll.destination) return;
    setCandidatesLoading(true);
    try {
      const places = await searchPlaces(
        "",
        watchAll.destination,
        (watchAll.interests ?? []) as Category[]
      );
      setCandidatePlaces(places);
    } catch {
      toast("Could not load real places for this city", "error");
    } finally {
      setCandidatesLoading(false);
    }
  }, [watchAll.destination, watchAll.interests, toast]);

  const togglePlaceSelection = (place: Place) => {
    setSelectedPlaceIds((prev) => {
      if (prev.includes(place.id)) {
        const next = prev.filter((id) => id !== place.id);
        const nextDurations = { ...customDurations };
        delete nextDurations[place.id];
        setCustomDurations(nextDurations);
        return next;
      }
      if (prev.length >= 3) {
        toast("First version is limited to 3 selected stops", "info");
        return prev;
      }
      setCustomDurations((d) => ({
        ...d,
        [place.id]: place.estimatedVisitMinutes || 30,
      }));
      return [...prev, place.id];
    });
  };

  const updateVisitDuration = (placeId: string, minutes: number) => {
    setCustomDurations((prev) => ({
      ...prev,
      [placeId]: Math.max(10, Math.min(180, minutes)),
    }));
  };

  const validateStep = async () => {
    const fields: Record<number, (keyof FormValues)[]> = {
      0: ["destination", "startLocation"],
      1: ["startTime", "returnTime", "safetyBufferMinutes"],
      2: ["interests", "pace", "transport"],
    };
    if (fields[step]) {
      const valid = await trigger(fields[step]);
      if (!valid) return false;
    }

    // Strict time validation on Step 1
    if (step === 1) {
      const [sh, sm] = (startTime || "09:00").split(":").map(Number);
      const [rh, rm] = (returnTime || "13:00").split(":").map(Number);
      let totalMinutes = (rh * 60 + rm) - (sh * 60 + sm);
      if (totalMinutes <= 0) totalMinutes += 24 * 60;
      if (totalMinutes - safetyBufferMinutes < 15) {
        toast("Exploration window after safety buffer must be at least 15 minutes.", "error");
        return false;
      }
    }

    return true;
  };

  const next = async () => {
    if (await validateStep()) {
      const nextStep = Math.min(step + 1, STEPS.length - 1);
      if (nextStep === 3) {
        loadCandidates();
      }
      setStep(nextStep);
    }
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const itin = await generateItinerary({
        ...values,
        interests: values.interests as Category[],
        pace: values.pace as Pace,
        transport: values.transport as Transport,
        selectedPlaceIds: selectedPlaceIds.length > 0 ? selectedPlaceIds : undefined,
        customVisitDurations:
          Object.keys(customDurations).length > 0 ? customDurations : undefined,
      });
      toast("Adventure created! 🎉", "success");
      router.push(`/adventure/${itin.id}`);
    } catch {
      toast("Could not generate itinerary. Try again.", "error");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? "bg-forest text-white"
                    : i === step
                    ? "bg-forest text-white ring-4 ring-forest/20"
                    : "bg-sage text-forest"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className="text-[10px] text-text-muted hidden sm:block whitespace-nowrap">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-all ${
                  i < step ? "bg-forest" : "bg-border-theme"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Step 0: Destination & Endpoints */}
            {step === 0 && (
              <>
                <h2 className="font-serif text-2xl text-text">Where are you headed?</h2>
                <Select
                  id="destination"
                  label="Destination area / city"
                  error={errors.destination?.message}
                  {...register("destination")}
                >
                  <option value="">Select a city…</option>
                  {MOCK_DESTINATIONS.map((d) => (
                    <option key={d.id} value={d.city}>
                      {d.city}, {d.country}
                    </option>
                  ))}
                </Select>
                <Input
                  id="startLocation"
                  label="Origin / Starting location"
                  placeholder="e.g. Hotel, train station, address…"
                  icon={<MapPin size={15} />}
                  error={errors.startLocation?.message}
                  {...register("startLocation")}
                />
                <Input
                  id="returnLocation"
                  label="Return point (Optional)"
                  placeholder="Leave blank to return to origin"
                  icon={<Compass size={15} />}
                  error={errors.returnLocation?.message}
                  {...register("returnLocation")}
                />
              </>
            )}

            {/* Step 1: Timing */}
            {step === 1 && (
              <>
                <h2 className="font-serif text-2xl text-text">Set your time window</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="startTime"
                    label="Start time"
                    type="time"
                    icon={<Clock size={15} />}
                    error={errors.startTime?.message}
                    {...register("startTime")}
                  />
                  <Input
                    id="returnTime"
                    label="Return deadline"
                    type="time"
                    icon={<Clock size={15} />}
                    error={errors.returnTime?.message}
                    {...register("returnTime")}
                  />
                </div>
                <Select
                  id="safetyBuffer"
                  label="Return buffer window"
                  {...register("safetyBufferMinutes", { valueAsNumber: true })}
                >
                  <option value={0}>No buffer</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (recommended)</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </Select>
                <div className="bg-sage/30 rounded-[14px] p-4 flex items-center gap-3">
                  <Clock size={18} className="text-forest" />
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {formatDuration(availableMinutes)} exploration window
                    </p>
                    <p className="text-xs text-text-muted">Strictly guaranteed before your return deadline.</p>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Preferences */}
            {step === 2 && (
              <>
                <h2 className="font-serif text-2xl text-text">Your adventure style</h2>

                {/* Interests */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Interests</label>
                  <Controller
                    name="interests"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => {
                          const meta = CATEGORY_META[cat];
                          const selected = field.value.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() =>
                                field.onChange(
                                  selected
                                    ? field.value.filter((c) => c !== cat)
                                    : [...field.value, cat]
                                )
                              }
                              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                selected
                                  ? "bg-forest text-white border-forest shadow-xs font-semibold"
                                  : "bg-white text-text-muted border-border-theme hover:border-forest/40 hover:text-text"
                              }`}
                            >
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                  {errors.interests && (
                    <p className="text-xs text-red-500">{errors.interests.message}</p>
                  )}
                </div>

                {/* Pace */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Pace</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PACE_OPTIONS.map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className={`cursor-pointer rounded-[14px] border p-3 text-center transition-all ${
                          watchAll.pace === value
                            ? "border-forest bg-forest/5 ring-2 ring-forest"
                            : "border-border-theme hover:border-forest/30"
                        }`}
                      >
                        <input
                          type="radio"
                          value={value}
                          {...register("pace")}
                          className="sr-only"
                        />
                        <p className="font-medium text-sm text-text">{label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{desc}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transport */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Travel Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSPORT_OPTIONS.map(({ value, label, emoji }) => (
                      <label
                        key={value}
                        className={`cursor-pointer rounded-[14px] border p-3 flex items-center gap-2 transition-all ${
                          watchAll.transport === value
                            ? "border-forest bg-forest/5 ring-2 ring-forest"
                            : "border-border-theme hover:border-forest/30"
                        }`}
                      >
                        <input
                          type="radio"
                          value={value}
                          {...register("transport")}
                          className="sr-only"
                        />
                        <span className="text-lg">{emoji}</span>
                        <span className="text-sm font-medium text-text">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Real Place Selection (Up to 3 stops) */}
            {step === 3 && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-2xl text-text">Select places (Up to 3)</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Discovered via Geoapify. Pick up to 3 stops or leave empty for auto-balance.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-forest/10 text-forest rounded-full">
                    {selectedPlaceIds.length}/3 selected
                  </span>
                </div>

                {candidatesLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted text-sm">
                    <Loader2 size={24} className="animate-spin text-forest" />
                    <span>Discovering real places in {watchAll.destination}…</span>
                  </div>
                ) : candidatePlaces.length === 0 ? (
                  <div className="p-6 text-center text-text-muted text-sm bg-white rounded-[16px] border border-border-theme">
                    No places found matching your categories. ODYSSEIO will auto-select the best candidate stops.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 thin-scroll">
                    {candidatePlaces.map((place) => {
                      const isSelected = selectedPlaceIds.includes(place.id);
                      const currentDuration =
                        customDurations[place.id] ?? place.estimatedVisitMinutes ?? 30;

                      return (
                        <div
                          key={place.id}
                          className={`rounded-[16px] border p-3.5 transition-all text-left ${
                            isSelected
                              ? "border-forest bg-forest/5 shadow-xs"
                              : "border-border-theme bg-white hover:border-forest/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => togglePlaceSelection(place)}
                              className="flex-1 text-left flex items-start gap-3"
                            >
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-forest text-white border-forest"
                                    : "border-border-theme bg-white"
                                }`}
                              >
                                {isSelected && <Check size={14} />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-text truncate">
                                  {place.name}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                  {place.address || place.city}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                                  <span className="capitalize bg-sage/50 text-forest font-medium px-2 py-0.5 rounded-full">
                                    {place.category}
                                  </span>
                                  {place.rating > 0 && (
                                    <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                                      <Star size={11} className="fill-amber-500" />
                                      {place.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Visit duration control for selected stop */}
                            {isSelected && (
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] text-text-muted font-medium">Visit</span>
                                <div className="flex items-center gap-1 bg-white border border-border-theme rounded-[8px] p-0.5">
                                  {[20, 30, 45, 60].map((mins) => (
                                    <button
                                      key={mins}
                                      type="button"
                                      onClick={() => updateVisitDuration(place.id, mins)}
                                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded-[6px] transition-colors ${
                                        currentDuration === mins
                                          ? "bg-forest text-white"
                                          : "text-text-muted hover:text-text"
                                      }`}
                                    >
                                      {mins}m
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Step 4: Summary & Feasibility Preview */}
            {step === 4 && (
              <>
                <h2 className="font-serif text-2xl text-text">Your adventure at a glance</h2>
                <div className="space-y-3">
                  {[
                    { label: "Destination", value: watchAll.destination || "Not set" },
                    { label: "Origin", value: watchAll.startLocation || "City centre" },
                    {
                      label: "Return point",
                      value: watchAll.returnLocation || watchAll.startLocation || "Origin",
                    },
                    { label: "Start time", value: startTime },
                    { label: "Return deadline", value: returnTime },
                    { label: "Available window", value: formatDuration(availableMinutes) },
                    { label: "Return buffer", value: `${safetyBufferMinutes} min` },
                    {
                      label: "Pace",
                      value:
                        (watchAll.pace ?? "balanced").charAt(0).toUpperCase() +
                        (watchAll.pace ?? "balanced").slice(1),
                    },
                    {
                      label: "Travel mode",
                      value:
                        (watchAll.transport ?? "walking").charAt(0).toUpperCase() +
                        (watchAll.transport ?? "walking").slice(1),
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm border-b border-border-theme pb-2">
                      <span className="text-text-muted">{label}</span>
                      <span className="font-medium text-text">{value}</span>
                    </div>
                  ))}

                  {selectedPlaceIds.length > 0 && (
                    <div className="pt-1">
                      <p className="text-sm text-text-muted mb-2">Selected Places ({selectedPlaceIds.length})</p>
                      <div className="space-y-1.5">
                        {selectedPlaceIds.map((pid) => {
                          const p = candidatePlaces.find((cp) => cp.id === pid);
                          const dur = customDurations[pid] || 30;
                          return (
                            <div
                              key={pid}
                              className="flex items-center justify-between text-xs bg-white border border-border-theme rounded-[10px] px-3 py-1.5"
                            >
                              <span className="font-medium text-text">{p?.name || pid}</span>
                              <span className="text-forest font-semibold">{dur} min visit</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <p className="text-sm text-text-muted mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {(watchAll.interests ?? []).map((i) => (
                        <span
                          key={i}
                          className="text-xs bg-sage text-forest px-2.5 py-1 rounded-full font-medium"
                        >
                          {CATEGORY_META[i as Category]?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {envContext && (
                  <div className="bg-sage/20 border border-border-theme rounded-[14px] p-3 space-y-2">
                    <p className="text-xs font-semibold text-forest flex items-center gap-1.5">
                      <CloudSun size={14} /> Destination Live Context
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {envContext.weather?.current && (
                        <div className="flex items-center gap-1.5 text-text-muted">
                          <span>🌤️ {envContext.weather.current.temperature}°C, {envContext.weather.current.description}</span>
                        </div>
                      )}
                      {envContext.airQuality?.category && (
                        <div className="flex items-center gap-1.5 text-text-muted">
                          <span>🍃 Air: {envContext.airQuality.category} (AQI {envContext.airQuality.aqi ?? "N/A"})</span>
                        </div>
                      )}
                    </div>
                    {watchAll.transport === "cycling" && envContext.bikeSharing?.available && (
                      <p className="text-xs text-text-muted flex items-center gap-1 pt-0.5">
                        <Bike size={13} className="text-forest" />
                        <span>{envContext.bikeSharing.networkName} ({envContext.bikeSharing.stations?.length ?? 0} nearby stations)</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-text-muted bg-white border border-border-theme rounded-[12px] p-2.5 text-center space-y-0.5">
                  <p className="font-medium text-text">Real Provider Attribution</p>
                  <p>Places by Geoapify · Turn-by-turn routing by OpenRouteService · Live weather by Open-Meteo</p>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border-theme">
          <Button
            type="button"
            variant="ghost"
            onClick={prev}
            disabled={step === 0}
            className={step === 0 ? "invisible" : ""}
          >
            <ChevronLeft size={16} />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} size="lg">
              Next
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Itinerary…
                </>
              ) : (
                "Generate Itinerary 🗺️"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
