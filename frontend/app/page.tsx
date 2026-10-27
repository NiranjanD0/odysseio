"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import {
  ArrowRight,
  Compass,
  Clock,
  RotateCcw,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MOCK_DESTINATIONS } from "@/lib/mock-data";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "📍",
    title: "Set your starting point",
    desc: "Choose a city and your starting location, then set a return deadline.",
  },
  {
    step: "02",
    icon: "⏱️",
    title: "Set your time limit",
    desc: "Tell us when you need to be back — we build a plan that fits perfectly.",
  },
  {
    step: "03",
    icon: "🎯",
    title: "Choose your adventure",
    desc: "Pick your interests, travel pace, and preferred transport mode.",
  },
  {
    step: "04",
    icon: "🗺️",
    title: "Explore and adapt",
    desc: "Follow your personalised itinerary, mark stops done, and replan anytime.",
  },
];

const FEATURES = [
  {
    icon: Clock,
    title: "Time-aware planning",
    desc: "Every minute counts. We build itineraries that respect your deadline, including travel time and a safety buffer.",
    bg: "bg-sage/30",
  },
  {
    icon: Compass,
    title: "Smart discovery",
    desc: "Find cafés, culture, hidden gems, local food, and more — filtered by your interests and time available.",
    bg: "bg-peach/30",
  },
  {
    icon: RotateCcw,
    title: "Live replanning",
    desc: "Running late? Spent too long somewhere? Replan your remaining journey in seconds.",
    bg: "bg-lavender/30",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-cream py-24 sm:py-32">
          {/* Background blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-peach/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-lavender/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-7"
              >
                <div className="inline-flex items-center gap-2 bg-white border border-border-theme rounded-full px-4 py-1.5 text-xs font-medium text-forest shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                  Smart city exploration
                </div>
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-text leading-[1.05]">
                  A little time.
                  <br />
                  <span className="text-forest">A whole new</span>
                  <br />
                  world.
                </h1>
                <p className="text-base sm:text-lg text-text-muted max-w-md leading-relaxed">
                  ODYSSEIO turns your limited time in an unfamiliar city into a
                  practical, personalised adventure — built around your deadline.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/plan"
                    id="hero-plan-cta"
                    className="inline-flex items-center justify-center gap-2 bg-forest text-white px-7 py-3.5 rounded-[14px] text-base font-medium hover:bg-forest-dark transition-colors shadow-md"
                  >
                    Plan my adventure
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/explore"
                    id="hero-explore-cta"
                    className="inline-flex items-center justify-center gap-2 bg-white text-forest border border-border-theme px-7 py-3.5 rounded-[14px] text-base font-medium hover:bg-sage/30 transition-colors shadow-sm"
                  >
                    <Compass size={18} />
                    Explore places
                  </Link>
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
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className={`relative rounded-[20px] overflow-hidden shadow-md ${
                      i === 0 ? "col-span-2 h-56" : "h-40"
                    }`}
                  >
                    <Image
                      src={dest.imageUrl}
                      alt={dest.city}
                      fill
                      className="object-cover"
                      sizes="300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 text-white">
                      <p className="font-serif text-lg leading-tight">{dest.city}</p>
                      <div className="flex items-center gap-1 text-xs text-white/70">
                        <MapPin size={10} />
                        <span>{dest.country}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 id="features-heading" className="font-serif text-4xl text-text mb-3">
                Built around your time
              </h2>
              <p className="text-text-muted max-w-xl mx-auto">
                Every feature is designed to make limited time feel expansive.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {FEATURES.map(({ icon: Icon, title, desc, bg }) => (
                <div
                  key={title}
                  className={`${bg} rounded-[20px] p-7 space-y-4`}
                >
                  <div className="w-12 h-12 bg-white rounded-[14px] shadow-sm flex items-center justify-center">
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
        <section className="py-20 bg-cream" aria-labelledby="how-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 id="how-heading" className="font-serif text-4xl text-text mb-3">
                How it works
              </h2>
              <p className="text-text-muted max-w-md mx-auto">
                From arrival to adventure in four simple steps.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map(({ step, icon, title, desc }) => (
                <div key={step} className="bg-white rounded-[20px] border border-border-theme p-6 space-y-3 relative">
                  <span className="text-3xl">{icon}</span>
                  <p className="absolute top-5 right-5 text-xs font-bold text-border-theme">{step}</p>
                  <h3 className="font-semibold text-text">{title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured destinations */}
        <section className="py-20 bg-white" aria-labelledby="destinations-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 id="destinations-heading" className="font-serif text-4xl text-text mb-2">
                  Featured destinations
                </h2>
                <p className="text-text-muted">Cities ready for your next adventure.</p>
              </div>
              <Link
                href="/explore"
                className="hidden sm:flex items-center gap-1 text-sm font-medium text-forest hover:underline"
              >
                View all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_DESTINATIONS.slice(0, 6).map((dest) => (
                <Link
                  key={dest.id}
                  href={`/explore?city=${dest.city}`}
                  className="group relative rounded-[20px] overflow-hidden shadow-md h-64 block"
                >
                  <Image
                    src={dest.imageUrl}
                    alt={dest.city}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-400"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="font-serif text-2xl leading-tight">{dest.city}</p>
                    <p className="text-sm text-white/70 mt-1">{dest.country} · {dest.placeCount} places</p>
                    <p className="text-xs text-white/60 mt-2 line-clamp-2">{dest.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="bg-forest py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-4">
              Every minute, a new story.
            </h2>
            <p className="text-white/70 text-lg mb-8">
              Start planning your next city adventure right now. No account needed.
            </p>
            <Link
              href="/plan"
              className="inline-flex items-center gap-2 bg-white text-forest px-8 py-4 rounded-[14px] text-base font-semibold hover:bg-sage transition-colors shadow-lg"
            >
              Start exploring
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
