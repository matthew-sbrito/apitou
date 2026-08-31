import { ServiceWorkerRegister } from "@/components/providers/sw-register";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";
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
  title: "Apitou - Organize sua pelada sem estresse",
  description:
    "Times, cronômetro, fila de quem ganha fica e súmula da pelada — tudo na palma da mão, direto na beira do campo.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/apitou-logo.png", type: "image/png" }],
    apple: "/apitou-logo.png",
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
