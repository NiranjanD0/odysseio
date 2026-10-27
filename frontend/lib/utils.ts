import type { Category } from "@/types";

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function getRemainingTime(deadline: string): number {
  const now = new Date();
  const [h, m] = deadline.split(":").map(Number);
  const deadlineMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime();
  return Math.max(0, Math.floor((deadlineMs - now.getTime()) / 60000));
}

export const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; color: string }
> = {
  cafe: { label: "Café", emoji: "☕", color: "bg-amber-100 text-amber-800" },
  food: { label: "Food", emoji: "🍽️", color: "bg-orange-100 text-orange-800" },
  culture: { label: "Culture", emoji: "🎭", color: "bg-purple-100 text-purple-800" },
  history: { label: "History", emoji: "🏛️", color: "bg-stone-100 text-stone-800" },
  nature: { label: "Nature", emoji: "🌿", color: "bg-green-100 text-green-800" },
  architecture: { label: "Architecture", emoji: "🏗️", color: "bg-blue-100 text-blue-800" },
  photography: { label: "Photography", emoji: "📸", color: "bg-pink-100 text-pink-800" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "bg-rose-100 text-rose-800" },
  "hidden-gem": { label: "Hidden Gem", emoji: "💎", color: "bg-cyan-100 text-cyan-800" },
  art: { label: "Art", emoji: "🎨", color: "bg-violet-100 text-violet-800" },
  nightlife: { label: "Nightlife", emoji: "🌙", color: "bg-indigo-100 text-indigo-800" },
};

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
