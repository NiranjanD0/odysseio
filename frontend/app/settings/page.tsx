"use client";

import { useState } from "react";
import {
  Save,
  RotateCcw,
  AlertTriangle,
  Footprints,
  Bus,
  Bike,
  Shuffle,
  Coffee,
  Compass,
  Zap,
} from "lucide-react";
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

const TRANSPORT_OPTIONS = [
  { value: "walking" as Transport, label: "Walking", icon: Footprints },
  { value: "public" as Transport, label: "Public Transit", icon: Bus },
  { value: "cycling" as Transport, label: "Cycling", icon: Bike },
  { value: "mixed" as Transport, label: "Mixed", icon: Shuffle },
];

const PACE_OPTIONS = [
  { value: "relaxed" as Pace, label: "Relaxed", icon: Coffee, desc: "Fewer stops, unhurried" },
  { value: "balanced" as Pace, label: "Balanced", icon: Compass, desc: "Comfortable exploration" },
  { value: "packed" as Pace, label: "Packed", icon: Zap, desc: "See as much as possible" },
];

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
    toast("Preferences saved successfully", "success");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (!confirm("Reset all demo data (journeys, saved places, preferences)? This cannot be undone.")) return;
    resetDemoData();
    setPrefs(getUserPreferences());
    toast("Demo data reset to initial defaults", "info");
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl sm:text-5xl text-text mb-2">Settings</h1>
          <p className="text-text-muted mb-10 text-sm">
            Customize your trip defaults, transit modes, and theme preferences.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Travel Pace */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4 shadow-xs">
              <div>
                <h2 className="font-semibold text-text text-base">Default travel pace</h2>
                <p className="text-xs text-text-muted mt-0.5">Controls pacing and visit duration.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PACE_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
                  const active = prefs.pace === value;
                  return (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-[14px] border p-4 flex flex-col gap-2 transition-all ${
                        active
                          ? "border-forest bg-forest/5 dark:bg-forest/10 ring-1 ring-forest/30"
                          : "border-border-theme hover:border-forest/30 hover:bg-sage/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pace"
                        value={value}
                        checked={active}
                        onChange={() => setPrefs((prev) => ({ ...prev, pace: value }))}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={active ? "text-forest" : "text-text-muted"} />
                        <span className="font-medium text-sm text-text">{label}</span>
                      </div>
                      <span className="text-xs text-text-muted leading-tight">{desc}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Transport Mode */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4 shadow-xs">
              <div>
                <h2 className="font-semibold text-text text-base">Default transit mode</h2>
                <p className="text-xs text-text-muted mt-0.5">Preferred routing option between stops.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TRANSPORT_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const active = prefs.transport === value;
                  return (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-[14px] border p-3.5 flex items-center gap-2.5 transition-all ${
                        active
                          ? "border-forest bg-forest/5 dark:bg-forest/10 ring-1 ring-forest/30"
                          : "border-border-theme hover:border-forest/30 hover:bg-sage/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="transport"
                        value={value}
                        checked={active}
                        onChange={() => setPrefs((prev) => ({ ...prev, transport: value }))}
                        className="sr-only"
                      />
                      <Icon size={16} className={active ? "text-forest" : "text-text-muted"} />
                      <span className="text-sm font-medium text-text">{label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Favorite Interests */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-4 shadow-xs">
              <div>
                <h2 className="font-semibold text-text text-base">Preferred interests</h2>
                <p className="text-xs text-text-muted mt-0.5">Select categories you want highlighted in itineraries.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const active = prefs.interests.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggle(cat)}
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
              </div>
            </section>

            {/* Safety Buffer */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-3 shadow-xs">
              <div>
                <h2 className="font-semibold text-text text-base">Default return safety buffer</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Protective reserve window scheduled before your deadline.
                </p>
              </div>
              <Select
                id="buffer"
                value={prefs.safetyBufferMinutes}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, safetyBufferMinutes: Number(e.target.value) }))
                }
              >
                <option value={0}>No buffer (exact departure)</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (recommended)</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes (relaxed)</option>
              </Select>
            </section>

            {/* Appearance / Theme */}
            <section className="bg-white rounded-[20px] border border-border-theme p-6 space-y-3 shadow-xs">
              <div>
                <h2 className="font-semibold text-text text-base">Appearance & theme</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Select between light, dark, or system default mode.
                </p>
              </div>
              <ThemeSwitcher variant="segmented" />
            </section>

            {/* Save Button */}
            <Button
              size="lg"
              className="w-full text-base py-3"
              onClick={handleSave}
            >
              <Save size={16} />
              {saved ? "Preferences saved" : "Save preferences"}
            </Button>

            {/* Reset Demo Data */}
            <section className="bg-white rounded-[20px] border border-red-500/20 p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                <AlertTriangle size={16} />
                <h2 className="font-semibold text-sm">Reset demo data</h2>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Clears all custom saved places, itineraries, and preferences stored in your browser.
              </p>
              <Button variant="danger" size="sm" onClick={handleReset}>
                <RotateCcw size={14} />
                Reset demo data
              </Button>
            </section>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
