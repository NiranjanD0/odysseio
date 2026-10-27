"use client";

import Image from "next/image";
import { Heart, Star, Clock, MapPin, Plus, ExternalLink, Compass } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/types";
import { CATEGORY_META, formatDuration, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { toggleSavedPlace, addStopToLatestJourney } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface PlaceDetailDrawerProps {
  place: Place | null;
  onClose: () => void;
  onAddToItinerary?: (place: Place) => void;
}

export function PlaceDetailDrawer({
  place,
  onClose,
  onAddToItinerary,
}: PlaceDetailDrawerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saved, setSaved] = useState(place?.isSaved ?? false);
  const [adding, setAdding] = useState(false);

  if (!place) return null;

  const cat = CATEGORY_META[place.category];

  const handleSave = async () => {
    const next = await toggleSavedPlace(place);
    setSaved(next);
    toast(next ? `Saved ${place.name}` : `Removed from saved`, next ? "success" : "info");
  };

  const handleAddStop = async () => {
    if (onAddToItinerary) {
      onAddToItinerary(place);
      onClose();
      return;
    }
    setAdding(true);
    try {
      const res = await addStopToLatestJourney(place);
      if (res.success) {
        toast(res.message, "success");
        onClose();
      } else {
        toast(res.message, "info");
      }
    } catch {
      toast("Could not add to itinerary", "error");
    } finally {
      setAdding(false);
    }
  };

  const handlePlanWithPlace = () => {
    onClose();
    router.push(`/plan?destination=${encodeURIComponent(place.city)}&startLocation=${encodeURIComponent(place.name)}`);
  };

  return (
    <Drawer open={!!place} onClose={onClose} title="Place Details">
      {/* Hero image */}
      <div className="relative h-56">
        <Image
          src={place.imageUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80"}
          alt={place.name}
          fill
          className="object-cover"
          sizes="480px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <Badge variant="category" colorClass={cat.color}>
            {cat.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Name + location */}
        <div>
          <h2 className="font-serif text-2xl text-text leading-tight">{place.name}</h2>
          <div className="flex items-center gap-1.5 text-sm text-text-muted mt-1">
            <MapPin size={14} />
            <span>{place.address}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-sage/30 rounded-[14px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-text">{place.rating}</span>
            </div>
            <p className="text-xs text-text-muted">{place.reviewCount.toLocaleString()} reviews</p>
          </div>
          <div className="bg-peach/30 rounded-[14px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock size={13} className="text-orange-600" />
              <span className="text-sm font-semibold text-text">{formatDuration(place.estimatedVisitMinutes)}</span>
            </div>
            <p className="text-xs text-text-muted">Est. visit</p>
          </div>
          {place.openingHours && (
            <div className="bg-lavender/30 rounded-[14px] p-3 text-center">
              <div className="text-sm font-semibold text-text mb-1">
                {formatTime(place.openingHours.open)}
              </div>
              <p className="text-xs text-text-muted">Opens · {place.openingHours.days}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-text-muted leading-relaxed">{place.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {place.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-cream text-text-muted px-2.5 py-1 rounded-full border border-border-theme"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleAddStop}
              disabled={adding}
              className="w-full text-xs"
            >
              <Plus size={15} />
              {adding ? "Adding…" : "Add to adventure"}
            </Button>
            <Button
              variant="secondary"
              onClick={handlePlanWithPlace}
              className="w-full text-xs"
            >
              <Compass size={15} />
              Plan new trip
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleSave}
            >
              <Heart
                size={15}
                className={saved ? "fill-red-500 text-red-500" : ""}
              />
              {saved ? "Saved" : "Save place"}
            </Button>
            <a
              href={`https://www.openstreetmap.org/?mlat=${place.coordinates.lat}&mlon=${place.coordinates.lng}#map=17/${place.coordinates.lat}/${place.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-[12px] bg-white border border-border-theme text-text-muted hover:bg-sage/40 transition-colors"
            >
              <ExternalLink size={14} />
              Directions
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-text-muted bg-cream rounded-[12px] px-3 py-2">
          ℹ️ Travel time estimates are simulated and may differ from real-world conditions.
        </p>
      </div>
    </Drawer>
  );
}
