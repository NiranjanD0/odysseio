"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Loader2, Clock, MapPin, CloudSun, Bike } from "lucide-react";
import type { Category, Pace, Transport, EnvironmentalContext } from "@/types";
import { CATEGORY_META, formatDuration } from "@/lib/utils";
import { generateItinerary, getUserPreferences, getEnvironmentalContext } from "@/lib/api";
import { MOCK_DESTINATIONS } from "@/lib/mock-data";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  destination: z.string().min(1, "Please select a destination"),
  startLocation: z.string().min(1, "Please enter a starting location"),
  startTime: z.string().min(1, "Required"),
  returnTime: z.string().min(1, "Required"),
  safetyBufferMinutes: z.number().min(0).max(60),
  interests: z.array(z.string()).min(1, "Pick at least one interest"),
  pace: z.enum(["relaxed", "balanced", "packed"] as const),
  transport: z.enum(["walking", "public", "cycling", "mixed"] as const),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Destination", "Timing", "Preferences", "Summary"];

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

  // Available time calc
  const availableMinutes = (() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [rh, rm] = returnTime.split(":").map(Number);
    return Math.max(0, (rh * 60 + rm) - (sh * 60 + sm) - safetyBufferMinutes);
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

  const validateStep = async () => {
    const fields: Record<number, (keyof FormValues)[]> = {
      0: ["destination", "startLocation"],
      1: ["startTime", "returnTime", "safetyBufferMinutes"],
      2: ["interests", "pace", "transport"],
    };
    const valid = await trigger(fields[step]);
    if (!valid) return false;

    // Strict time validation on Step 1
    if (step === 1) {
      const [sh, sm] = (startTime || "09:00").split(":").map(Number);
      const [rh, rm] = (returnTime || "13:00").split(":").map(Number);
      const totalMinutes = (rh * 60 + rm) - (sh * 60 + sm);
      if (totalMinutes <= 0) {
        toast("Return time must be later than start time.", "error");
        return false;
      }
      if (totalMinutes - safetyBufferMinutes < 15) {
        toast("Exploration window after safety buffer must be at least 15 minutes.", "error");
        return false;
      }
    }

    return true;
  };

  const next = async () => {
    if (await validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
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
      {/* Progress */}
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
              <span className="text-[10px] text-text-muted hidden sm:block">{label}</span>
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
            {/* Step 0: Destination */}
            {step === 0 && (
              <>
                <h2 className="font-serif text-2xl text-text">Where are you headed?</h2>
                <Select
                  id="destination"
                  label="Destination city"
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
                  label="Starting location"
                  placeholder="e.g. Hotel, train station…"
                  icon={<MapPin size={15} />}
                  error={errors.startLocation?.message}
                  {...register("startLocation")}
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
                    label="Return by"
                    type="time"
                    icon={<Clock size={15} />}
                    error={errors.returnTime?.message}
                    {...register("returnTime")}
                  />
                </div>
                <Select
                  id="safetyBuffer"
                  label="Safety buffer"
                  {...register("safetyBufferMinutes", { valueAsNumber: true })}
                >
                  <option value={0}>No buffer</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </Select>
                <div className="bg-sage/30 rounded-[14px] p-4 flex items-center gap-3">
                  <Clock size={18} className="text-forest" />
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {formatDuration(availableMinutes)} available
                    </p>
                    <p className="text-xs text-text-muted">After safety buffer</p>
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
                            ? "border-forest bg-forest/5"
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
                  <label className="text-sm font-medium text-text">Transport</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSPORT_OPTIONS.map(({ value, label, emoji }) => (
                      <label
                        key={value}
                        className={`cursor-pointer rounded-[14px] border p-3 flex items-center gap-2 transition-all ${
                          watchAll.transport === value
                            ? "border-forest bg-forest/5"
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

            {/* Step 3: Summary */}
            {step === 3 && (
              <>
                <h2 className="font-serif text-2xl text-text">Your adventure at a glance</h2>
                <div className="space-y-3">
                  {[
                    { label: "Destination", value: watchAll.destination || "Not set" },
                    { label: "Starting from", value: watchAll.startLocation || "City centre" },
                    { label: "Start time", value: startTime },
                    { label: "Return by", value: returnTime },
                    { label: "Available time", value: formatDuration(availableMinutes) },
                    { label: "Safety buffer", value: `${safetyBufferMinutes} min` },
                    { label: "Pace", value: (watchAll.pace ?? "balanced").charAt(0).toUpperCase() + (watchAll.pace ?? "balanced").slice(1) },
                    { label: "Transport", value: (watchAll.transport ?? "walking").charAt(0).toUpperCase() + (watchAll.transport ?? "walking").slice(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm border-b border-border-theme pb-2">
                      <span className="text-text-muted">{label}</span>
                      <span className="font-medium text-text">{value}</span>
                    </div>
                  ))}
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
                <p className="text-xs text-text-muted bg-cream rounded-[12px] px-3 py-2">
                  ⚡ Itinerary will be generated from mock data. Travel times are simulated.
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
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
                  Generating…
                </>
              ) : (
                "Create adventure 🗺️"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
