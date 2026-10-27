"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
import {
  Clock,
  ChevronLeft,
  RotateCcw,
  CheckCircle,
  SkipForward,
  AlertTriangle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StopCard } from "@/components/adventure/StopCard";
import { PlaceDetailDrawer } from "@/components/explore/PlaceDetailDrawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { getItinerary, saveJourney, replanItinerary } from "@/lib/api";
import { formatDuration, formatTime, getRemainingTime } from "@/lib/utils";
import type { Itinerary, ItineraryStop } from "@/types";

// Dynamically load map to avoid SSR issues
const AdventureMap = nextDynamic(
  () =>
    import("@/components/adventure/AdventureMap").then((m) => m.AdventureMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-sage/20 rounded-[20px] flex items-center justify-center text-text-muted text-sm">Loading map…</div> }
);

function AdventureContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStopId, setActiveStopId] = useState<string | undefined>();
  const [detailStop, setDetailStop] = useState<ItineraryStop | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "list">("list");
  const [remaining, setRemaining] = useState(0);
  const [replanning, setReplanning] = useState(false);

  useEffect(() => {
    getItinerary(id).then((data) => {
      setItinerary(data);
      if (data?.stops[0]) setActiveStopId(data.stops[0].id);
      setLoading(false);
    });
  }, [id]);

  // Live remaining time
  useEffect(() => {
    if (!itinerary) return;
    const update = () => setRemaining(getRemainingTime(itinerary.returnDeadline));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [itinerary]);

  const updateItinerary = useCallback(
    async (updated: Itinerary) => {
      setItinerary(updated);
      await saveJourney(updated);
    },
    []
  );

  const handleComplete = async (stopId: string) => {
    if (!itinerary) return;
    const updated = {
      ...itinerary,
      stops: itinerary.stops.map((s) =>
        s.id === stopId ? { ...s, status: "completed" as const } : s
      ),
    };
    await updateItinerary(updated);
    toast("Stop marked as completed! ✓", "success");
    // Move to next upcoming stop
    const next = updated.stops.find((s) => s.status === "upcoming");
    if (next) setActiveStopId(next.id);
  };

  const handleSkip = async (stopId: string) => {
    if (!itinerary) return;
    const updated = {
      ...itinerary,
      stops: itinerary.stops.map((s) =>
        s.id === stopId ? { ...s, status: "skipped" as const } : s
      ),
    };
    await updateItinerary(updated);
    toast("Stop skipped", "info");
  };

  const handleReplan = async () => {
    if (!itinerary) return;
    setReplanning(true);
    try {
      const updated = await replanItinerary(itinerary, remaining);
      setItinerary(updated);
      toast("Itinerary replanned! 🔄", "success");
    } catch {
      toast("Replanning failed. Try again.", "error");
    } finally {
      setReplanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="text-center space-y-3">
          <span className="text-4xl animate-pulse block">🗺️</span>
          <p className="text-text-muted text-sm">Loading adventure…</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <>
        <Header />
        <EmptyState
          emoji="🌍"
          title="Adventure not found"
          description="This itinerary doesn't exist or has been removed."
          actionLabel="Back to journeys"
          actionHref="/journeys"
        />
      </>
    );
  }

  const completedCount = itinerary.stops.filter((s) => s.status === "completed").length;
  const totalActive = itinerary.stops.filter((s) => s.status !== "skipped").length;
  const progress = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;
  const isRunningLate = remaining < 30 && remaining > 0;

  return (
    <>
      <Header />
      <main className="flex-1 h-[calc(100vh-64px)] flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-border-theme px-4 sm:px-6 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-lg text-text leading-tight truncate">
              {itinerary.title}
            </h1>
            <p className="text-xs text-text-muted">{itinerary.city} · {itinerary.date}</p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              isRunningLate ? "bg-red-100 text-red-700" : "bg-sage/40 text-forest"
            }`}>
              {isRunningLate && <AlertTriangle size={12} />}
              <Clock size={12} />
              <span>{formatDuration(remaining)} left</span>
            </div>
            <Badge variant="info">
              {completedCount}/{totalActive} stops
            </Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReplan}
            disabled={replanning}
            className="shrink-0"
          >
            <RotateCcw size={14} className={replanning ? "animate-spin" : ""} />
            Replan
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border-theme">
          <div
            className="h-full bg-forest transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Mobile tab switcher */}
        <div className="md:hidden flex border-b border-border-theme bg-white">
          {(["list", "map"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === tab
                  ? "text-forest border-b-2 border-forest"
                  : "text-text-muted"
              }`}
            >
              {tab === "list" ? "Itinerary" : "Map"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Map — desktop always visible, mobile tab-switched */}
          <div
            className={`${
              mobileTab === "map" ? "block" : "hidden"
            } md:block md:flex-1 p-4`}
          >
            <AdventureMap
              itinerary={itinerary}
              activeStopId={activeStopId}
              onMarkerClick={(stopId) => {
                setActiveStopId(stopId);
                setMobileTab("list");
              }}
            />
          </div>

          {/* Itinerary panel */}
          <div
            className={`${
              mobileTab === "list" ? "flex" : "hidden"
            } md:flex md:w-96 flex-col border-l border-border-theme bg-cream`}
          >
            <div className="px-4 py-3 bg-white border-b border-border-theme">
              <p className="text-xs text-text-muted">
                Return by <strong className="text-text">{formatTime(itinerary.returnDeadline)}</strong>
                {" · "}{formatDuration(itinerary.safetyBufferMinutes)} safety buffer
              </p>
              {/* Mini stats */}
              <div className="flex gap-3 mt-2 text-xs text-text-muted sm:hidden">
                <div className={`flex items-center gap-1 ${isRunningLate ? "text-red-600" : "text-forest"}`}>
                  <Clock size={11} />
                  {formatDuration(remaining)} left
                </div>
                <span>{completedCount}/{totalActive} stops done</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-3">
              {itinerary.stops.map((stop, i) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={i}
                  isActive={stop.id === activeStopId}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  onDetails={(s) => setDetailStop(s)}
                  onClick={(sid) => setActiveStopId(sid)}
                />
              ))}
              {itinerary.stops.every((s) => s.status === "completed" || s.status === "skipped") && (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-3">🎉</span>
                  <p className="font-semibold text-text">Adventure complete!</p>
                  <p className="text-xs text-text-muted mt-1">Great exploring today.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Place detail drawer */}
      <PlaceDetailDrawer
        place={detailStop?.place ?? null}
        onClose={() => setDetailStop(null)}
      />
    </>
  );
}

export default function AdventurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-cream">
          <div className="text-center space-y-3">
            <span className="text-4xl animate-pulse block">🗺️</span>
            <p className="text-text-muted text-sm">Loading adventure…</p>
          </div>
        </div>
      }
    >
      <AdventureContent />
    </Suspense>
  );
}
