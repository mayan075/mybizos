import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { StorageMigrationRunner } from "@/components/storage-migration-runner";

export const metadata: Metadata = {
  title: {
    default: "HararAI — AI-Powered Business OS for Local Services",
    template: "%s | HararAI",
  },
  description:
    "AI-native business operating system for local service businesses. Never miss a lead — AI answers every call, qualifies prospects, and books appointments 24/7.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "HararAI",
    title: "HararAI — AI-Powered Business OS for Local Services",
    description:
      "Never miss a lead. AI answers every call, qualifies prospects, and books appointments 24/7. Built for HVAC, plumbing, removals, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HararAI — AI-Powered Business OS for Local Services",
    description:
      "Never miss a lead. AI answers every call, qualifies prospects, and books appointments 24/7.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("hararai_theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background font-sans antialiased`}>
        <div className="noise-overlay" aria-hidden="true" />
        <ToastProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ToastProvider>
        <StorageMigrationRunner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
