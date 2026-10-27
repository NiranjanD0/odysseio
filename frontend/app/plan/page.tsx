import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlanWizard } from "@/components/planner/PlanWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan an Adventure",
  description: "Create a personalised time-aware city itinerary with ODYSSEIO.",
};

export default function PlanPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-serif text-5xl text-text mb-3">Plan your adventure</h1>
            <p className="text-text-muted max-w-md mx-auto">
              Tell us where you are, when you need to be back, and what you love. We&apos;ll do the rest.
            </p>
          </div>
          <PlanWizard />
        </div>
      </main>
      <Footer />
    </>
  );
}
