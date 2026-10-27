import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ODYSSEIO — Every minute, a new story",
    template: "%s | ODYSSEIO",
  },
  description:
    "ODYSSEIO is your intelligent city-exploration companion. Plan time-aware adventures, discover hidden gems, and explore unfamiliar cities with confidence.",
  keywords: ["travel", "city exploration", "itinerary", "adventure", "places"],
  openGraph: {
    title: "ODYSSEIO — Every minute, a new story",
    description: "Plan time-aware city adventures with ODYSSEIO.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#315B48",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
