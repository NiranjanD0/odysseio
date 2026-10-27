"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  Copy,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { motion } from "motion/react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/loader-skeleton";
import { useToast } from "@/components/ui/Toast";
import { getJourneys, deleteJourney, saveJourney } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import type { Itinerary, JourneyStatus } from "@/types";
import { MOCK_PLACES } from "@/lib/mock-data";

const STATUS_META: Record<JourneyStatus, { label: string; color: string }> = {
  upcoming: { label: "Upcoming", color: "bg-lavender text-indigo-700" },
  "in-progress": { label: "In Progress", color: "bg-peach text-orange-700" },
  completed: { label: "Completed", color: "bg-sage text-forest" },
};

export default function JourneysPage() {
  const { toast } = useToast();
  const [journeys, setJourneys] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JourneyStatus | "all">("all");

  useEffect(() => {
    let mounted = true;
    getJourneys().then((data) => {
      if (mounted) {
        setJourneys(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      if (!confirm(`Delete "${title}"?`)) return;
      await deleteJourney(id);
      setJourneys((prev) => prev.filter((j) => j.id !== id));
      toast(`Deleted "${title}"`, "info");
    },
    [toast]
  );

  const handleDuplicate = useCallback(
    async (itinerary: Itinerary) => {
      const copy: Itinerary = {
        ...itinerary,
        id: `itin-copy-${Date.now()}`,
        title: `Copy of ${itinerary.title}`,
        status: "upcoming",
        createdAt: new Date().toISOString(),
      };
      await saveJourney(copy);
      setJourneys((prev) => [copy, ...prev]);
      toast("Journey duplicated", "success");
    },
    [toast]
  );

  const filtered = filter === "all" ? journeys : journeys.filter((j) => j.status === filter);
  const cover = (itin: Itinerary) => {
    const stopImg = itin.stops.find((s) => s.place.imageUrl && s.place.imageUrl.trim() !== "")?.place.imageUrl;
    return stopImg || MOCK_PLACES[0].imageUrl;
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl text-text mb-2">My journeys</h1>
              <p className="text-text-muted">Your adventures, past and future.</p>
            </div>
            <Link
              href="/plan"
              className="hidden sm:inline-flex items-center gap-2 bg-forest text-white px-5 py-2.5 rounded-[12px] text-sm font-medium hover:bg-forest-dark transition-colors"
            >
              + New adventure
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-7 overflow-x-auto pb-1">
            {(["all", "upcoming", "in-progress", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-[12px] text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? "bg-forest text-white"
                    : "bg-white border border-border-theme text-text-muted hover:bg-sage/30"
                }`}
              >
                {f === "all" ? "All" : STATUS_META[f].label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[20px] border border-border-theme overflow-hidden shadow-xs">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              emoji="🧭"
              title={filter === "all" ? "No journeys yet" : `No ${filter} journeys`}
              description="Plan your first adventure and it will appear here."
              actionLabel="Plan an adventure"
              actionHref="/plan"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((journey, i) => (
                <motion.article
                  key={journey.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[20px] border border-border-theme overflow-hidden
                             hover:shadow-[0_6px_24px_rgba(49,91,72,0.12)] hover:-translate-y-0.5
                             transition-all duration-200"
                >
                  {/* Cover */}
                  <Link href={`/adventure/${journey.id}`} className="relative block h-44 group">
                    <Image
                      src={cover(journey)}
                      alt={journey.city}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 400px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_META[journey.status].color}`}>
                        {STATUS_META[journey.status].label}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4 text-white">
                      <p className="font-serif text-lg leading-tight">{journey.city}</p>
                    </div>
                  </Link>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <h2 className="font-semibold text-text leading-snug line-clamp-1">
                      {journey.title}
                    </h2>
                    <div className="grid grid-cols-3 text-xs text-text-muted gap-2">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {journey.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(journey.totalMinutes)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={11} />
                        {journey.stops.length} stops
                      </div>
                    </div>

                    {/* Progress for in-progress */}
                    {journey.status === "in-progress" && (
                      <div>
                        <div className="h-1.5 bg-border-theme rounded-full overflow-hidden">
                          <div
                            className="h-full bg-forest rounded-full"
                            style={{
                              width: `${(journey.stops.filter((s) => s.status === "completed").length / journey.stops.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/adventure/${journey.id}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-forest text-white py-2 rounded-[10px] text-xs font-medium hover:bg-forest-dark transition-colors"
                      >
                        {journey.status === "completed" ? (
                          <><CheckCircle2 size={13} /> View</>
                        ) : (
                          <><Play size={13} /> {journey.status === "upcoming" ? "Start" : "Resume"}</>
                        )}
                      </Link>
                      <button
                        onClick={() => handleDuplicate(journey)}
                        className="p-2 rounded-[10px] bg-white border border-border-theme text-text-muted hover:bg-sage/40 transition-colors"
                        aria-label="Duplicate journey"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(journey.id, journey.title)}
                        className="p-2 rounded-[10px] bg-white border border-border-theme text-red-400 hover:bg-red-50 transition-colors"
                        aria-label="Delete journey"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
