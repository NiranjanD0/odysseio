"use client";

import Image from "next/image";
import { motion } from "motion/react";
import {
  ArrowRight,
  Compass,
  Clock,
  RotateCcw,
  MapPin,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CurtainLink } from "@/components/ui/page-curtains";
import { MOCK_DESTINATIONS } from "@/lib/mock-data";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: MapPin,
    title: "Set starting location",
    desc: "Select your destination city and departure location.",
  },
  {
    step: "02",
    icon: Clock,
    title: "Define available time",
    desc: "Set your return deadline — ODYSSEIO schedules within your limit.",
  },
  {
    step: "03",
    icon: Compass,
    title: "Customize preferences",
    desc: "Pick your interests, pace, and transport mode.",
  },
  {
    step: "04",
    icon: Sparkles,
    title: "Explore with certainty",
    desc: "Follow timed routes, track stops, and replan if plans change.",
  },
];

const FEATURES = [
  {
    icon: Clock,
    title: "Time-aware planning",
    desc: "Every minute counts. Itineraries respect your strict return deadline, accounting for travel times and buffer windows.",
    bg: "bg-sage/30 dark:bg-sage/10",
  },
  {
    icon: RotateCcw,
    title: "Dynamic replanning",
    desc: "Running behind schedule or lingering too long? Rebalance your remaining stops deterministically in seconds.",
    bg: "bg-peach/40 dark:bg-peach/10",
  },
  {
    icon: Compass,
    title: "Curated city discovery",
    desc: "Discover architecture, neighborhood cafés, iconic vistas, and authentic hidden gems hand-picked for short trips.",
    bg: "bg-lavender/40 dark:bg-lavender/10",
  },
];

export default function LandingPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-12 pb-24 sm:pt-20 sm:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              {/* Left copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 max-w-xl"
              >
                <div className="inline-flex items-center gap-2 bg-white dark:bg-white/5 border border-border-theme rounded-full px-4 py-1.5 text-xs font-medium text-forest dark:text-forest shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                  Time-aware city exploration
                </div>
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-text leading-[1.08] tracking-tight">
                  A little time.
                  <br />
                  <span className="italic text-forest">A whole new world.</span>
                </h1>
                <p className="text-text-muted text-lg sm:text-xl font-normal leading-relaxed">
                  Turn layovers, free afternoons, and tight travel windows into memorable adventures.
                  Smart itineraries crafted for the exact minutes you have.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <CurtainLink
                    href="/plan"
                    id="hero-plan-cta"
                    className="inline-flex items-center justify-center gap-2 bg-forest text-white px-7 py-3.5 rounded-[14px] text-base font-medium hover:bg-forest-dark transition-all shadow-sm"
                  >
                    Plan my adventure
                    <ArrowRight size={18} />
                  </CurtainLink>
                  <CurtainLink
                    href="/explore"
                    id="hero-explore-cta"
                    className="inline-flex items-center justify-center gap-2 bg-white dark:bg-white/5 text-forest dark:text-forest border border-border-theme px-7 py-3.5 rounded-[14px] text-base font-medium hover:bg-sage/30 dark:hover:bg-sage/10 transition-colors shadow-xs"
                  >
                    <Compass size={18} />
                    Explore places
                  </CurtainLink>
                </div>
              </motion.div>

              {/* Right: destination cards preview */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="hidden lg:grid grid-cols-2 gap-4"
              >
                {MOCK_DESTINATIONS.slice(0, 4).map((dest, i) => (
                  <motion.div
                    key={dest.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                    className="group relative rounded-[20px] overflow-hidden shadow-md h-52 block"
                  >
                    <Image
                      src={dest.imageUrl}
                      alt={dest.city}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 1024px) 100vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="font-serif text-xl leading-tight">{dest.city}</p>
                      <p className="text-xs text-white/80 mt-0.5">{dest.country} · {dest.placeCount} places</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white dark:bg-white/5 border-y border-border-theme" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 id="features-heading" className="font-serif text-4xl text-text mb-3">
                Crafted for limited time
              </h2>
              <p className="text-text-muted max-w-lg mx-auto text-sm sm:text-base">
                ODYSSEIO optimizes every segment so you explore freely without checking your watch constantly.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {FEATURES.map(({ icon: Icon, title, desc, bg }) => (
                <div
                  key={title}
                  className={`${bg} rounded-[20px] p-7 space-y-4 border border-border-theme/40`}
                >
                  <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-[14px] shadow-xs flex items-center justify-center">
                    <Icon size={22} className="text-forest" />
                  </div>
                  <h3 className="font-semibold text-lg text-text">{title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 bg-cream dark:bg-cream" aria-labelledby="how-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 id="how-heading" className="font-serif text-4xl text-text mb-3">
                How it works
              </h2>
              <p className="text-text-muted max-w-md mx-auto text-sm">
                From arrival to exploration in four simple steps.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="bg-white rounded-[20px] border border-border-theme p-6 space-y-3.5 relative shadow-xs">
                  <div className="w-10 h-10 rounded-[12px] bg-sage/40 dark:bg-sage/20 flex items-center justify-center text-forest">
                    <Icon size={20} />
                  </div>
                  <p className="absolute top-5 right-5 text-xs font-bold text-border-theme">{step}</p>
                  <h3 className="font-semibold text-text text-base">{title}</h3>
                  <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured destinations */}
        <section className="py-20 bg-white dark:bg-white/5 border-t border-border-theme" aria-labelledby="destinations-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 id="destinations-heading" className="font-serif text-4xl text-text mb-2">
                  Featured destinations
                </h2>
                <p className="text-text-muted text-sm">Cities ready for your next adventure.</p>
              </div>
              <CurtainLink
                href="/explore"
                className="hidden sm:flex items-center gap-1 text-sm font-medium text-forest hover:underline"
              >
                View all <ChevronRight size={16} />
              </CurtainLink>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_DESTINATIONS.slice(0, 6).map((dest) => (
                <CurtainLink
                  key={dest.id}
                  href={`/explore?city=${dest.city}`}
                  className="group relative rounded-[20px] overflow-hidden shadow-sm h-64 block"
                >
                  <Image
                    src={dest.imageUrl}
                    alt={dest.city}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="font-serif text-2xl leading-tight">{dest.city}</p>
                    <p className="text-xs text-white/80 mt-1">{dest.country} · {dest.placeCount} places</p>
                    <p className="text-xs text-white/70 mt-2 line-clamp-2">{dest.description}</p>
                  </div>
                </CurtainLink>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="bg-forest py-20 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-serif text-4xl sm:text-5xl mb-4 text-cream">
              Every minute, a new story.
            </h2>
            <p className="text-white/80 text-base sm:text-lg mb-8 max-w-xl mx-auto">
              Start planning your next city adventure right now. Seamless, intelligent, and time-aware.
            </p>
            <CurtainLink
              href="/plan"
              className="inline-flex items-center gap-2 bg-cream text-forest px-8 py-3.5 rounded-[14px] text-base font-semibold hover:bg-white transition-colors shadow-lg"
            >
              Start exploring
              <ArrowRight size={18} />
            </CurtainLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
