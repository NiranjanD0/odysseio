"use client";

import { useState } from "react";
import { Save, RotateCcw, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import {
  getUserPreferences,
  saveUserPreferences,
  resetDemoData,
} from "@/lib/api";
import { CATEGORY_META } from "@/lib/utils";
import type { Category, Pace, Transport, UserPreferences } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export default function SettingsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    if (typeof window !== "undefined") {
      return getUserPreferences();
    }
    return {
      pace: "balanced",
      transport: "walking",
      interests: ["food", "culture"],
      safetyBufferMinutes: 15,
    };
  });
  const [saved, setSaved] = useState(false);

  const toggle = (cat: Category) =>
    setPrefs((p) => ({
      ...p,
      interests: p.interests.includes(cat)
        ? p.interests.filter((c) => c !== cat)
        : [...p.interests, cat],
    }));

  const handleSave = () => {
    saveUserPreferences(prefs);
    setSaved(true);
    toast("Preferences saved!", "success");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (!confirm("Reset all demo data (journeys, saved places, preferences)? This cannot be undone.")) return;
    resetDemoData();
    setPrefs(getUserPreferences());
    toast("Demo data reset", "info");
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl sm:text-5xl text-text mb-2">Settings</h1>
          <p className="text-text-muted mb-10">Manage your adventure preferences.</p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Pace */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4">
              <h2 className="font-semibold text-text">Default travel pace</h2>
              <div className="grid grid-cols-3 gap-3">
                {(["relaxed", "balanced", "packed"] as Pace[]).map((p) => (
                  <label
                    key={p}
                    className={`cursor-pointer rounded-[14px] border p-3 text-center transition-all ${
                      prefs.pace === p ? "border-forest bg-forest/5" : "border-border-theme hover:border-forest/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pace"
                      value={p}
                      checked={prefs.pace === p}
                      onChange={() => setPrefs((prev) => ({ ...prev, pace: p }))}
                      className="sr-only"
                    />
                    <p className="font-medium text-sm text-text capitalize">{p}</p>
                  </label>
                ))}
              </div>
            </section>

            {/* Transport */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4">
              <h2 className="font-semibold text-text">Default transport</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "walking", emoji: "🚶", label: "Walking" },
                  { value: "public", emoji: "🚇", label: "Public Transit" },
                  { value: "cycling", emoji: "🚲", label: "Cycling" },
                  { value: "mixed", emoji: "🔀", label: "Mixed" },
                ] as { value: Transport; emoji: string; label: string }[]).map(({ value, emoji, label }) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-[14px] border p-3 flex items-center gap-2 transition-all ${
                      prefs.transport === value ? "border-forest bg-forest/5" : "border-border-theme hover:border-forest/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="transport"
                      value={value}
                      checked={prefs.transport === value}
                      onChange={() => setPrefs((prev) => ({ ...prev, transport: value }))}
                      className="sr-only"
                    />
                    <span className="text-lg">{emoji}</span>
                    <span className="text-sm font-medium text-text">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Interests */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4">
              <h2 className="font-semibold text-text">Favourite interests</h2>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const active = prefs.interests.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggle(cat)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        active
                          ? "bg-forest text-white border-forest"
                          : "bg-white text-text-muted border-border-theme hover:border-forest/40"
                      }`}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Safety buffer */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4">
              <h2 className="font-semibold text-text">Default safety buffer</h2>
              <Select
                id="buffer"
                value={prefs.safetyBufferMinutes}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, safetyBufferMinutes: Number(e.target.value) }))
                }
              >
                <option value={0}>No buffer</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </Select>
            </section>

            {/* Appearance / Theme */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-3">
              <div>
                <h2 className="font-semibold text-text">Appearance & theme</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Choose between light, dark, or system default mode.
                </p>
              </div>
              <ThemeSwitcher variant="segmented" />
            </section>

            {/* Save */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
            >
              <Save size={16} />
              {saved ? "Saved!" : "Save preferences"}
            </Button>

            {/* Reset demo data */}
            <section className="bg-white rounded-[20px] border border-red-200 p-6 space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={16} />
                <h2 className="font-semibold">Reset demo data</h2>
              </div>
              <p className="text-sm text-text-muted">
                This will clear all saved journeys, saved places, and reset preferences to defaults.
                This action cannot be undone.
              </p>
              <Button variant="danger" onClick={handleReset}>
                <RotateCcw size={15} />
                Reset all demo data
              </Button>
            </section>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
