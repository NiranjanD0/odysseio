"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Heart, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlaceCard } from "@/components/explore/PlaceCard";
import { PlaceDetailDrawer } from "@/components/explore/PlaceDetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceCardSkeleton } from "@/components/ui/loader-skeleton";
import { getSavedPlaces } from "@/lib/api";
import { CATEGORY_META } from "@/lib/utils";
import type { Place, Category } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export default function SavedPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "">("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    let mounted = true;
    getSavedPlaces().then((data) => {
      if (mounted) {
        setPlaces(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return places.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q);
      const matchCat = !activeCategory || p.category === activeCategory;
      return matchQ && matchCat;
    });
  }, [places, query, activeCategory]);

  const handleSaveToggle = useCallback((place: Place, saved: boolean) => {
    if (!saved) setPlaces((prev) => prev.filter((p) => p.id !== place.id));
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="font-serif text-4xl sm:text-5xl text-text mb-2">
              <Heart className="inline mr-2 text-red-400 fill-red-400" size={36} />
              Saved places
            </h1>
            <p className="text-text-muted">Your favourite spots, all in one place.</p>
          </div>

          {/* Search + filter */}
          <div className="bg-white rounded-[20px] border border-border-theme p-4 mb-6 space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="saved-search"
                type="search"
                placeholder="Search saved places…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-[12px] border border-border-theme bg-cream pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-2 focus:outline-forest"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => places.some((p) => p.category === c)).map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(active ? "" : cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active
                        ? "bg-forest text-white border-forest shadow-xs font-semibold"
                        : "bg-white text-text-muted border-border-theme hover:border-forest/40 hover:text-text"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory("")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-text-muted hover:text-text border border-border-theme"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <PlaceCardSkeleton key={i} />
              ))}
            </div>
          ) : places.length === 0 ? (
            <EmptyState
              icon={<Heart size={26} className="text-forest" />}
              title="Nothing saved yet"
              description="Explore places and tap the heart icon to save your favourites here."
              actionLabel="Explore places"
              actionHref="/explore"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={26} className="text-forest" />}
              title="No matches"
              description="Try a different search or clear the filter."
              actionLabel="Clear"
              onAction={() => { setQuery(""); setActiveCategory(""); }}
            />
          ) : (
            <>
              <p className="text-xs text-text-muted mb-4">{filtered.length} saved place{filtered.length !== 1 ? "s" : ""}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((place, i) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <PlaceCard
                      place={place}
                      onClick={setSelectedPlace}
                      onSaveToggle={handleSaveToggle}
                    />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <PlaceDetailDrawer
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />

      <Footer />
    </>
  );
}
