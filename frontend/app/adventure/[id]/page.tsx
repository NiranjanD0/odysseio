"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
import {
  Clock,
  ChevronLeft,
  RotateCcw,
  AlertTriangle,
  Send,
  Edit3,
  Check,
  X,
  CloudSun,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StopCard } from "@/components/adventure/StopCard";
import { PlaceDetailDrawer } from "@/components/explore/PlaceDetailDrawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  getItinerary,
  saveJourney,
  replanItinerary,
  sendTelegramNotification,
  getEnvironmentalContext,
  removeStopFromJourney,
} from "@/lib/api";
import { formatDuration, formatTime, getRemainingTime } from "@/lib/utils";
import type { Itinerary, ItineraryStop, EnvironmentalContext } from "@/types";

// Dynamically load map to avoid SSR issues
const AdventureMap = nextDynamic(
  () =>
    import("@/components/adventure/AdventureMap").then((m) => m.AdventureMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-sage/20 rounded-[20px] flex items-center justify-center text-text-muted text-sm">
        Loading map…
      </div>
    ),
  }
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
  const [proposedPlan, setProposedPlan] = useState<Itinerary | null>(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [envContext, setEnvContext] = useState<EnvironmentalContext | null>(null);

  useEffect(() => {
    getItinerary(id).then((data) => {
      setItinerary(data);
      if (data?.stops[0]) setActiveStopId(data.stops[0].id);
      if (data?.returnDeadline) setNewDeadline(data.returnDeadline);
      if (data?.centerCoordinates) {
        getEnvironmentalContext(
          data.centerCoordinates.lat,
          data.centerCoordinates.lng
        ).then(setEnvContext);
      }
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
    const updatedStops = itinerary.stops.map((s) =>
      s.id === stopId ? { ...s, status: "completed" as const } : s
    );
    const allDone = updatedStops.every(
      (s) => s.status === "completed" || s.status === "skipped"
    );
    const updated: Itinerary = {
      ...itinerary,
      status: allDone ? "completed" : "in-progress",
      stops: updatedStops,
    };
    await updateItinerary(updated);
    toast("Stop marked as completed! ✓", "success");
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

  const handleRemove = async (stopId: string) => {
    if (!itinerary) return;
    const updated = await removeStopFromJourney(itinerary.id, stopId);
    if (updated) {
      setItinerary(updated);
      toast("Stop removed from itinerary", "info");
    }
  };

  const handleStartReplan = async () => {
    if (!itinerary) return;
    setReplanning(true);
    try {
      const proposal = await replanItinerary(itinerary, remaining);
      setProposedPlan(proposal);
    } catch {
      toast("Replanning calculation failed. Try again.", "error");
    } finally {
      setReplanning(false);
    }
  };

  const handleAcceptReplan = async () => {
    if (!proposedPlan) return;
    await updateItinerary(proposedPlan);
    setProposedPlan(null);
    toast("Revised itinerary accepted! 🔄", "success");
  };

  const handleRejectReplan = () => {
    setProposedPlan(null);
    toast("Proposal discarded. Kept original itinerary unchanged.", "info");
  };

  const handleUpdateDeadline = async () => {
    if (!itinerary || !newDeadline) return;
    const updated: Itinerary = {
      ...itinerary,
      returnDeadline: newDeadline,
    };
    await updateItinerary(updated);
    setShowDeadlineModal(false);
    toast(`Return deadline updated to ${formatTime(newDeadline)}`, "success");
  };

  const handleTelegramShare = async () => {
    if (!itinerary) return;
    setSendingTelegram(true);
    try {
      const res = await sendTelegramNotification(itinerary.id);
      if (res.success) {
        toast("Itinerary sent to Telegram! ✈️", "success");
      } else {
        toast(res.message || "Telegram service not configured", "info");
      }
    } catch {
      toast("Failed to trigger Telegram notification", "error");
    } finally {
      setSendingTelegram(false);
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
  const hasExceededTime = remaining <= 0;

  return (
    <>
      <Header />
      <main className="flex-1 h-[calc(100vh-64px)] flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-border-theme px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="shrink-0 text-xs px-2.5"
            >
              <ChevronLeft size={16} />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="font-serif text-base sm:text-lg text-text leading-tight truncate">
                {itinerary.title}
              </h1>
              <p className="text-xs text-text-muted">
                {itinerary.city} · Start: {formatTime(itinerary.startTime)} · Return: {formatTime(itinerary.returnDeadline)}
              </p>
            </div>
          </div>

          {/* Context pill & Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            {envContext?.weather?.current && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-text-muted bg-cream px-2.5 py-1 rounded-full border border-border-theme">
                <CloudSun size={13} className="text-forest" />
                <span>{envContext.weather.current.temperature}°C, {envContext.weather.current.description}</span>
                {envContext.airQuality?.category && (
                  <span className="text-forest font-medium">· Air {envContext.airQuality.category}</span>
                )}
              </div>
            )}

            <button
              onClick={() => setShowDeadlineModal(true)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                hasExceededTime
                  ? "bg-red-500 text-white border-red-600 animate-pulse"
                  : isRunningLate
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-sage/40 text-forest border-border-theme hover:border-forest/40"
              }`}
              title="Click to adjust return deadline"
            >
              {isRunningLate || hasExceededTime ? <AlertTriangle size={12} /> : <Clock size={12} />}
              <span>{hasExceededTime ? "Past deadline" : `${formatDuration(remaining)} left`}</span>
              <Edit3 size={11} className="opacity-70 ml-0.5" />
            </button>

            <Badge variant="info" className="text-xs">
              {completedCount}/{totalActive} stops
            </Badge>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleStartReplan}
              disabled={replanning}
              className="text-xs shrink-0"
            >
              <RotateCcw size={13} className={replanning ? "animate-spin" : ""} />
              {replanning ? "Calculating…" : "Replan"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTelegramShare}
              disabled={sendingTelegram}
              className="text-xs shrink-0 text-text-muted hover:text-text"
              title="Share itinerary via Telegram bot"
            >
              <Send size={13} className={sendingTelegram ? "animate-pulse" : ""} />
              Telegram
            </Button>
          </div>
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

        {/* Main Content */}
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
            <div className="px-4 py-3 bg-white border-b border-border-theme space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">
                  Start: <strong>{formatTime(itinerary.startTime)}</strong>
                </span>
                <span className="text-text-muted">
                  Return by <strong className="text-text">{formatTime(itinerary.returnDeadline)}</strong>
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-text-muted">
                <span>{itinerary.safetyBufferMinutes}m safety buffer</span>
                <span>Pace: {itinerary.pace} ({itinerary.transport})</span>
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
                  onRemove={handleRemove}
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

      {/* Replan Comparison & Proposal Modal */}
      {proposedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-border-theme space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-2xl text-text flex items-center gap-2">
                  <Sparkles size={20} className="text-forest" />
                  Proposed Replan
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Comparison between your active itinerary and the revised plan.
                </p>
              </div>
              <button
                onClick={handleRejectReplan}
                className="text-text-muted hover:text-text p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Diff Summary */}
            <div className="bg-sage/20 border border-border-theme rounded-[16px] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Remaining Window:</span>
                <span className="font-semibold text-text">{formatDuration(remaining)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Return Deadline:</span>
                <span className="font-semibold text-text">{formatTime(proposedPlan.returnDeadline)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Proposed Stops Kept:</span>
                <span className="font-semibold text-forest">
                  {proposedPlan.stops.filter((s) => s.status !== "skipped").length} active stops
                </span>
              </div>
            </div>

            {/* Stops list comparison */}
            <div className="flex-1 overflow-y-auto thin-scroll space-y-2 pr-1">
              <p className="text-xs font-semibold text-text-muted">Proposed Stops &amp; Schedule:</p>
              {proposedPlan.stops.map((stop, i) => {
                const wasSkipped = stop.status === "skipped";
                return (
                  <div
                    key={stop.id}
                    className={`p-3 rounded-[12px] border flex items-center justify-between text-xs ${
                      wasSkipped
                        ? "bg-cream/40 border-border-theme text-text-muted opacity-60 line-through"
                        : "bg-white border-forest/30 text-text"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{i + 1}. {stop.place.name}</p>
                      <p className="text-[11px] text-text-muted">
                        {wasSkipped ? "Skipped (does not fit remaining time)" : `${formatTime(stop.arrivalTime)} – ${formatTime(stop.departureTime)}`}
                      </p>
                    </div>
                    <Badge variant={wasSkipped ? "warning" : "category"}>
                      {wasSkipped ? "Skipped" : "Kept"}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Decision Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-border-theme">
              <Button
                variant="ghost"
                onClick={handleRejectReplan}
                className="flex-1 text-text-muted"
              >
                <X size={15} />
                Keep Original
              </Button>
              <Button
                onClick={handleAcceptReplan}
                className="flex-1 bg-forest hover:bg-forest-dark text-white"
              >
                <Check size={15} />
                Accept Revised Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Return Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-[20px] max-w-sm w-full p-5 shadow-xl border border-border-theme space-y-4">
            <h3 className="font-serif text-xl text-text">Adjust Return Deadline</h3>
            <p className="text-xs text-text-muted">
              Update the required return time for this adventure. ODYSSEIO will recalculate remaining time.
            </p>
            <div>
              <label htmlFor="new-deadline-input" className="block text-xs font-semibold text-text mb-1">
                New return time:
              </label>
              <input
                id="new-deadline-input"
                type="time"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full rounded-[12px] border border-border-theme bg-cream p-2.5 text-sm text-text"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowDeadlineModal(false)}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDeadline}
                className="flex-1 text-xs bg-forest text-white"
              >
                Save Deadline
              </Button>
            </div>
          </div>
        </div>
      )}
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
