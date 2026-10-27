"use client";

import { CheckCircle, SkipForward, ChevronRight, Clock, ArrowRight, Trash2 } from "lucide-react";
import type { ItineraryStop } from "@/types";
import { CATEGORY_META, formatDuration, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface StopCardProps {
  stop: ItineraryStop;
  index: number;
  isActive: boolean;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onRemove?: (id: string) => void;
  onDetails: (stop: ItineraryStop) => void;
  onClick: (id: string) => void;
}

export function StopCard({
  stop,
  index,
  isActive,
  onComplete,
  onSkip,
  onRemove,
  onDetails,
  onClick,
}: StopCardProps) {
  const cat = CATEGORY_META[stop.place.category];
  const isCompleted = stop.status === "completed";
  const isSkipped = stop.status === "skipped";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(stop.id)}
      onKeyDown={(e) => e.key === "Enter" && onClick(stop.id)}
      className={cn(
        "rounded-[16px] border p-4 transition-all duration-200 cursor-pointer",
        isActive
          ? "border-forest bg-sage/30 shadow-md"
          : isCompleted
          ? "border-forest/30 bg-forest/5"
          : isSkipped
          ? "border-border-theme bg-cream/50 opacity-60"
          : "border-border-theme bg-white hover:border-forest/30 hover:bg-sage/10"
      )}
    >
      {/* Travel time from previous */}
      {stop.travelTimeFromPrev > 0 && (
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
          <ArrowRight size={12} />
          <span>~{stop.travelTimeFromPrev} min travel</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Number bubble */}
        <div
          className={cn(
            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
            isCompleted
              ? "bg-forest text-white"
              : isSkipped
              ? "bg-border-theme text-text-muted"
              : isActive
              ? "bg-forest text-white"
              : "bg-sage text-forest"
          )}
        >
          {isCompleted ? <CheckCircle size={14} /> : isSkipped ? <SkipForward size={14} /> : index + 1}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-text leading-snug line-clamp-1">
              {stop.place.name}
            </h4>
            <Badge variant="category" colorClass={cat.color} className="shrink-0 text-[10px]">
              {cat.emoji}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>{formatTime(stop.arrivalTime)} – {formatTime(stop.departureTime)}</span>
            <div className="flex items-center gap-1">
              <Clock size={10} />
              <span>{formatDuration(stop.place.estimatedVisitMinutes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions (only for active / upcoming) */}
      {!isCompleted && !isSkipped && (
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs py-1 px-2"
            onClick={(e) => { e.stopPropagation(); onDetails(stop); }}
          >
            Details <ChevronRight size={12} />
          </Button>
          <div className="flex-1" />
          {onRemove && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs py-1 px-2 text-red-500 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(stop.id);
              }}
              title="Remove stop"
            >
              <Trash2 size={12} />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs py-1 px-2 text-text-muted"
            onClick={(e) => { e.stopPropagation(); onSkip(stop.id); }}
          >
            <SkipForward size={12} />
            Skip
          </Button>
          <Button
            size="sm"
            className="text-xs py-1 px-3"
            onClick={(e) => { e.stopPropagation(); onComplete(stop.id); }}
          >
            <CheckCircle size={12} />
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
