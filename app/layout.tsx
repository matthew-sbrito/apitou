import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Big_Shoulders } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/providers/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Modeled on industrial stadium/skyline signage — condensed, tall,
// high-contrast. Its `opsz` axis covers everything from compact nav labels
// to hero-sized scoreboard digits from a single variable font file.
const bigShoulders = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Apitou — organize sua pelada sem estresse",
  description:
    "Times, cronômetro, fila de quem ganha fica e súmula da pelada — tudo na palma da mão, direto na beira do campo.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/apitou-logo.webp", type: "image/webp" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apitou-logo.webp",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-(image:--gradient-mesh)"
        >
          <div className="absolute inset-0 bg-(image:--texture-grain) opacity-[0.035] mix-blend-overlay" />
        </div>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
