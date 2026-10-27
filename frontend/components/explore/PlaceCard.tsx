"use client";

import Image from "next/image";
import { Heart, Star, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import type { Place } from "@/types";
import { CATEGORY_META, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { toggleSavedPlace } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface PlaceCardProps {
  place: Place;
  onClick?: (place: Place) => void;
  onSaveToggle?: (place: Place, saved: boolean) => void;
}

export function PlaceCard({ place, onClick, onSaveToggle }: PlaceCardProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(place.isSaved ?? false);
  const cat = CATEGORY_META[place.category];

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = await toggleSavedPlace(place);
    setSaved(next);
    toast(next ? `Saved ${place.name}` : `Removed ${place.name} from saved`, next ? "success" : "info");
    onSaveToggle?.(place, next);
  };

  return (
    <article
      className="bg-white rounded-[20px] border border-border-theme overflow-hidden
                 hover:shadow-[0_6px_24px_0_rgba(49,91,72,0.13)] hover:-translate-y-0.5
                 transition-all duration-200 cursor-pointer group"
      onClick={() => onClick?.(place)}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(place)}
      role="button"
      aria-label={`View ${place.name}`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={place.imageUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80"}
          alt={place.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 380px"
        />
        {/* Save button */}
        <button
          onClick={handleSave}
          aria-label={saved ? "Unsave place" : "Save place"}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm
                     hover:bg-white transition-colors shadow-sm"
        >
          <Heart
            size={16}
            className={saved ? "fill-red-500 text-red-500" : "text-text-muted"}
          />
        </button>
        {/* Category badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="category" colorClass={cat.color}>
            {cat.label}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-text leading-snug line-clamp-1">{place.name}</h3>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <MapPin size={11} />
          <span>{place.city}, {place.country}</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{place.description}</p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-text">{place.rating}</span>
            <span className="text-xs text-text-muted">({place.reviewCount.toLocaleString()})</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock size={11} />
            <span>{formatDuration(place.estimatedVisitMinutes)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
