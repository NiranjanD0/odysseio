"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlaceCard } from "@/components/explore/PlaceCard";
import { PlaceDetailDrawer } from "@/components/explore/PlaceDetailDrawer";
import { PlaceCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_META } from "@/lib/utils";
import { searchPlaces, getDestinations } from "@/lib/api";
import type { Place, Destination, Category } from "@/types";
import { MOCK_DESTINATIONS } from "@/lib/mock-data";

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

function ExploreContent() {
  const searchParams = useSearchParams();
  const cityParam = searchParams.get("city") ?? "";

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(cityParam);
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const results = await searchPlaces(query, city, activeCategories);
    setPlaces(results);
    setLoading(false);
  }, [query, city, activeCategories]);

  useEffect(() => {
    getDestinations().then(setDestinations);
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchPlaces, 250);
    return () => clearTimeout(t);
  }, [fetchPlaces]);

  const toggleCategory = (cat: Category) =>
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="font-serif text-4xl sm:text-5xl text-text mb-2">Explore places</h1>
            <p className="text-text-muted">Discover hidden gems, iconic landmarks, and everything in between.</p>
          </div>

          {/* Destination quick-select */}
          {!city && (
            <section className="mb-10" aria-label="Featured destinations">
              <h2 className="font-semibold text-text mb-4">Destinations</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {MOCK_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => setCity(dest.city)}
                    className="shrink-0 relative rounded-[16px] overflow-hidden w-36 h-24 group"
                  >
                    <Image
                      src={dest.imageUrl}
                      alt={dest.city}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="144px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">{dest.city}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Search + filters */}
          <div className="bg-white rounded-[20px] border border-border-theme p-4 mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="search"
                  id="explore-search"
                  placeholder="Search places, categories…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-[12px] border border-border-theme bg-cream pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-2 focus:outline-forest"
                />
              </div>
              <select
                id="explore-city-filter"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-[12px] border border-border-theme bg-cream px-3 py-2.5 text-sm text-text focus:outline-2 focus:outline-forest"
              >
                <option value="">All cities</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.city}>{d.city}</option>
                ))}
              </select>
            </div>
            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = activeCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
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
              {activeCategories.length > 0 && (
                <button
                  onClick={() => setActiveCategories([])}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-text-muted hover:text-text border border-border-theme transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <PlaceCardSkeleton key={i} />
              ))}
            </div>
          ) : places.length === 0 ? (
            <EmptyState
              emoji="🔍"
              title="No places found"
              description="Try adjusting your search or clearing some filters."
              actionLabel="Clear filters"
              onAction={() => { setQuery(""); setCity(""); setActiveCategories([]); }}
            />
          ) : (
            <>
              <p className="text-xs text-text-muted mb-4">
                {places.length} place{places.length !== 1 ? "s" : ""} found
                {city ? ` in ${city}` : ""}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {places.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onClick={setSelectedPlace}
                  />
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

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
